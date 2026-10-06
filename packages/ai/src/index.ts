// AI layer (spec §31–35). Advisory only: it explains the *verified* route and may
// recommend, but never calculates authoritative values and has no authority.
//
// - Input is aggregates only: no names, no party ids, no per-employee amounts.
// - Output is schema-validated; anything malformed falls back to a deterministic text.
// - If the model's suggested redemption differs from the verified one, the
//   disagreement is recorded and the verified number is what the app uses.

import { z } from "zod";
import { formatAmount, parseAmount, type RoutingResult } from "@lute/routing";

export interface AiInput {
  obligationType: "payroll";
  obligationTotal: string;
  lineCount: number;
  liquidBalance: string;
  productiveBalance: string;
  shortfall: string;
  verifiedRoute: { route: "CASH_ONLY" | "CASH_THEN_REDEEM"; cashUsed: string; redeemAmount: string };
  remainingProductive: string;
  policy: { minCashBuffer: string; maxRedeemPerExecution: string | null; approvalThreshold: number; approvers: number };
}

/** Builds the minimal aggregate input. Rejects a blocked route: there is nothing to explain. */
export function buildAiInput(args: {
  route: RoutingResult;
  obligationTotal: string;
  lineCount: number;
  liquidBalance: string;
  productiveBalance: string;
  policy: AiInput["policy"];
}): AiInput {
  if (args.route.route === null) throw new Error("cannot explain a blocked route");
  return {
    obligationType: "payroll",
    obligationTotal: args.obligationTotal,
    lineCount: args.lineCount,
    liquidBalance: args.liquidBalance,
    productiveBalance: args.productiveBalance,
    shortfall: args.route.shortfall,
    verifiedRoute: {
      route: args.route.route === "CashOnly" ? "CASH_ONLY" : "CASH_THEN_REDEEM",
      cashUsed: args.route.cashUsed,
      redeemAmount: args.route.redeemAmount,
    },
    remainingProductive: args.route.remainingProductive,
    policy: args.policy,
  };
}

const decimalString = z.string().regex(/^\d+(\.\d{1,10})?$/);

export const AiOutputSchema = z.object({
  summary: z.string().min(1).max(1200),
  risks: z.array(z.string().max(400)).max(8),
  recommendation: z.enum(["CASH_ONLY", "CASH_THEN_REDEEM"]),
  suggestedRedeem: decimalString,
});
export type AiOutput = z.infer<typeof AiOutputSchema>;

export interface Explanation extends AiOutput {
  source: "qwen" | "fallback";
  /** Why the fallback was used, when it was. */
  fallbackReason?: string;
  /** False when the model's suggestion differs from the verified route. */
  agreesWithVerified: boolean;
  verifiedRedeem: string;
}

export interface QwenConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export function qwenConfigFromEnv(env: Record<string, string | undefined> = process.env): QwenConfig {
  return { apiKey: env.QWEN_API_KEY || undefined, baseUrl: env.QWEN_BASE_URL || undefined, model: env.QWEN_MODEL || undefined };
}

const SYSTEM_PROMPT = [
  "You are a treasury analyst assistant for an institutional payments workflow.",
  "You receive aggregate figures and a funding route that has ALREADY been verified by a deterministic engine.",
  "Explain the verified route in 2-4 plain sentences for a finance approver, and list concrete risks.",
  "Never invent numbers. Do not change the verified amounts. You have no authority over funds.",
  'Reply with ONLY a JSON object: {"summary": string, "risks": string[], "recommendation": "CASH_ONLY" | "CASH_THEN_REDEEM", "suggestedRedeem": decimal string}.',
].join(" ");

/** Explains a verified route. Never throws: failures produce the deterministic fallback. */
export async function explainRoute(input: AiInput, cfg: QwenConfig): Promise<Explanation> {
  if (!cfg.apiKey || !cfg.baseUrl || !cfg.model) return fallback(input, "Qwen not configured");
  const doFetch = cfg.fetchImpl ?? fetch;
  let content: string;
  try {
    const res = await doFetch(`${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(input) },
        ],
      }),
      signal: AbortSignal.timeout(cfg.timeoutMs ?? 20_000),
    });
    if (!res.ok) return fallback(input, `Qwen HTTP ${res.status}`);
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    content = body.choices?.[0]?.message?.content ?? "";
  } catch (e) {
    return fallback(input, `Qwen unavailable: ${e instanceof Error ? e.name : "error"}`);
  }

  const parsed = AiOutputSchema.safeParse(extractJson(content));
  if (!parsed.success) return fallback(input, "Qwen output failed schema validation");
  return {
    ...parsed.data,
    source: "qwen",
    agreesWithVerified: sameAmount(parsed.data.suggestedRedeem, input.verifiedRoute.redeemAmount),
    verifiedRedeem: input.verifiedRoute.redeemAmount,
  };
}

/** Deterministic explanation built only from verified numbers. */
export function fallback(input: AiInput, reason: string): Explanation {
  const r = input.verifiedRoute;
  const g = group;
  const summary =
    r.route === "CASH_ONLY"
      ? `Liquid balance of ${g(input.liquidBalance)} covers the ${g(input.obligationTotal)} obligation. Pay ${g(r.cashUsed)} from cash; all ${g(input.productiveBalance)} of productive assets stay invested.`
      : `The ${g(input.obligationTotal)} obligation exceeds available cash by ${g(input.shortfall)}. Use ${g(r.cashUsed)} cash and redeem exactly ${g(r.redeemAmount)} of the productive asset; ${g(input.remainingProductive)} stays invested.`;
  const risks = [
    ...(r.route === "CASH_THEN_REDEEM" ? ["Redemption depends on the facility being open with sufficient capacity at execution time."] : []),
    ...(input.policy.minCashBuffer === "0" ? ["No minimum cash buffer is configured; cash is fully drawn down."] : []),
  ];
  return {
    summary,
    risks,
    recommendation: r.route,
    suggestedRedeem: r.redeemAmount,
    source: "fallback",
    fallbackReason: reason,
    agreesWithVerified: true,
    verifiedRedeem: r.redeemAmount,
  };
}

/** Thousands separators on a decimal string, without converting to a float. */
function group(amount: string): string {
  const [whole, frac] = amount.split(".");
  return `${whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${frac ? `.${frac}` : ""}`;
}

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function sameAmount(a: string, b: string): boolean {
  try {
    return formatAmount(parseAmount(a)) === formatAmount(parseAmount(b));
  } catch {
    return false;
  }
}
