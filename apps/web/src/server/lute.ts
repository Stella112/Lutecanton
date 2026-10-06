// Server-only wiring: builds the ledger-backed Lute service from environment.
// Imported only by route handlers; never by client components.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isLedgerError, LedgerClient, passwordGrant } from "@lute/canton";
import { discoverParties, ensureParties, LuteLedger, type PartyRegistry } from "@lute/domain";
import { buildAiInput, explainRoute, qwenConfigFromEnv, type Explanation } from "@lute/ai";
import { formatAmount, parseAmount } from "@lute/routing";

export type Network = "local" | "devnet";

export function network(): Network {
  const n = process.env.CANTON_NETWORK ?? "local";
  if (n !== "local" && n !== "devnet") {
    // MainNet custom contracts are not supported (docs/CLAIMS.md); never switch silently.
    throw new Error(`unsupported CANTON_NETWORK for the treasury workflow: ${n}`);
  }
  return n;
}

/** Demo-only tools (AI-overruled stress test, facility toggle). Off unless explicitly enabled. */
export const demoToolsEnabled = () => process.env.LUTE_DEMO_TOOLS === "true";

const g = globalThis as unknown as { __lute?: Promise<LuteLedger> };

export function lute(): Promise<LuteLedger> {
  g.__lute ??= init().catch((e) => {
    g.__lute = undefined; // allow retry after e.g. the tunnel comes up
    throw e;
  });
  return g.__lute;
}

async function init(): Promise<LuteLedger> {
  const prefix = process.env.LUTE_PARTY_PREFIX ?? "lute-";
  if (network() === "local") {
    const client = new LedgerClient({
      baseUrl: process.env.LUTE_LEDGER_URL ?? "http://localhost:6864",
      userId: "lute-app",
    });
    const dar = process.env.LUTE_DAR_PATH ?? resolve(process.cwd(), "../../dist/lute-core-0.1.0.dar");
    await client.uploadDar(readFileSync(dar));
    return new LuteLedger(client, await ensureParties(client, prefix));
  }
  const env = requireEnv(["CANTON_JSON_LEDGER_API_URL", "CANTON_OIDC_TOKEN_URL", "CANTON_CLIENT_ID", "CANTON_USERNAME", "CANTON_PASSWORD", "CANTON_LEDGER_USER_ID", "LUTE_PARTY_PREFIX"]);
  const client = new LedgerClient({
    baseUrl: env.CANTON_JSON_LEDGER_API_URL,
    userId: env.CANTON_LEDGER_USER_ID,
    auth: passwordGrant({
      tokenUrl: env.CANTON_OIDC_TOKEN_URL,
      clientId: env.CANTON_CLIENT_ID,
      username: env.CANTON_USERNAME,
      password: env.CANTON_PASSWORD,
    }),
  });
  // On DevNet the DAR is uploaded and parties are created in the NODERS Console.
  return new LuteLedger(client, await discoverParties(client, prefix));
}

function requireEnv<K extends string>(keys: K[]): Record<K, string> {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`missing environment: ${missing.join(", ")}`);
  return Object.fromEntries(keys.map((k) => [k, process.env[k]!])) as Record<K, string>;
}

// Explanations are cached per verified route so polling does not call the model repeatedly.
const explanationCache = new Map<string, Promise<Explanation>>();

export async function explain(l: LuteLedger): Promise<Explanation | null> {
  const st = await l.treasuryState();
  const obligation = st.batch?.payload ?? (st.proposal?.payload.batch as Record<string, unknown> | undefined);
  if (!st.route || st.route.route === null || !obligation || !st.policy) return null;
  const pol = st.policy.payload;
  const input = buildAiInput({
    route: st.route,
    obligationTotal: formatAmount(parseAmount(String(obligation.total))),
    lineCount: (obligation.lines as unknown[]).length,
    liquidBalance: st.cash,
    productiveBalance: st.productive,
    policy: {
      minCashBuffer: formatAmount(parseAmount(String(pol.minCashBuffer))),
      maxRedeemPerExecution: pol.maxRedeemPerExecution === null ? null : formatAmount(parseAmount(String(pol.maxRedeemPerExecution))),
      approvalThreshold: Number(pol.approvalThreshold),
      approvers: (pol.approvers as unknown[]).length,
    },
  });
  const key = JSON.stringify(input);
  let p = explanationCache.get(key);
  if (!p) {
    p = explainRoute(input, qwenConfigFromEnv());
    explanationCache.set(key, p);
  }
  return p;
}

export function partyLabels(parties: PartyRegistry): Record<string, string> {
  return Object.fromEntries(Object.entries(parties).map(([role, party]) => [party, role]));
}

/** Maps errors to JSON responses. Never turns a failure into success. */
export function errorResponse(e: unknown): Response {
  if (isLedgerError(e)) {
    return Response.json({ error: "ledger_rejected", code: e.code, message: e.message, traceId: e.traceId }, { status: 422 });
  }
  const message = e instanceof Error ? e.message : String(e);
  const unreachable = /fetch failed|ECONNREFUSED/i.test(message);
  return Response.json({ error: unreachable ? "ledger_unreachable" : "error", message }, { status: unreachable ? 503 : 500 });
}

/** Rejects cross-site POSTs (simple CSRF guard for this demo backend). */
export function assertSameOrigin(req: Request): Response | null {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return Response.json({ error: "forbidden", message: "cross-origin request" }, { status: 403 });
  }
  return null;
}
