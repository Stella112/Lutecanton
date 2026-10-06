import { test } from "node:test";
import assert from "node:assert/strict";
import { computeFundingRoute } from "@lute/routing";
import { buildAiInput, explainRoute, type AiInput } from "../src/index.ts";

const route = computeFundingRoute({
  cash: "20000",
  productive: "15000",
  redeemable: "15000",
  obligation: "24800",
  policy: { minCashBuffer: "0", maxRedeemPerExecution: null, allowedRoutes: ["CashOnly", "CashThenRedeem"] },
});
const input: AiInput = buildAiInput({
  route,
  obligationTotal: "24800",
  lineCount: 5,
  liquidBalance: "20000",
  productiveBalance: "15000",
  policy: { minCashBuffer: "0", maxRedeemPerExecution: null, approvalThreshold: 2, approvers: 3 },
});
const cfg = { apiKey: "test-key", baseUrl: "https://example.invalid/v1", model: "test-model" };

const fakeFetch = (content: string, status = 200): typeof fetch =>
  (async () => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status })) as typeof fetch;

test("input carries aggregates only: no party ids, names or per-line amounts", () => {
  const json = JSON.stringify(input);
  assert.ok(!json.includes("::"), "no party ids");
  for (const name of ["Alice", "Ben", "Chidi", "David", "Eva"]) assert.ok(!json.includes(name));
  assert.deepEqual(Object.keys(input).sort(), [
    "lineCount", "liquidBalance", "obligationTotal", "obligationType", "policy", "productiveBalance", "remainingProductive", "shortfall", "verifiedRoute",
  ]);
});

test("not configured → deterministic fallback with verified numbers", async () => {
  const e = await explainRoute(input, {});
  assert.equal(e.source, "fallback");
  assert.equal(e.suggestedRedeem, "4800");
  assert.match(e.summary, /redeem exactly 4,800/);
  assert.match(e.summary, /10,200 stays invested/);
});

test("valid Qwen answer is used and agrees", async () => {
  const content = JSON.stringify({ summary: "Use cash then redeem 4800.", risks: ["facility"], recommendation: "CASH_THEN_REDEEM", suggestedRedeem: "4800.00" });
  const e = await explainRoute(input, { ...cfg, fetchImpl: fakeFetch(content) });
  assert.equal(e.source, "qwen");
  assert.equal(e.agreesWithVerified, true);
});

test("JSON wrapped in prose / code fences is still parsed", async () => {
  const content = 'Sure:\n```json\n{"summary":"ok","risks":[],"recommendation":"CASH_THEN_REDEEM","suggestedRedeem":"4800"}\n```';
  const e = await explainRoute(input, { ...cfg, fetchImpl: fakeFetch(content) });
  assert.equal(e.source, "qwen");
});

test("S5: AI suggesting 8000 is recorded as disagreement; verified 4800 kept", async () => {
  const content = JSON.stringify({ summary: "Redeem more to be safe.", risks: [], recommendation: "CASH_THEN_REDEEM", suggestedRedeem: "8000" });
  const e = await explainRoute(input, { ...cfg, fetchImpl: fakeFetch(content) });
  assert.equal(e.agreesWithVerified, false);
  assert.equal(e.suggestedRedeem, "8000");
  assert.equal(e.verifiedRedeem, "4800");
});

test("malformed output → fallback", async () => {
  for (const content of ["not json", '{"summary":"x"}', '{"summary":"x","risks":[],"recommendation":"SELL_ALL","suggestedRedeem":"1"}', '{"summary":"x","risks":[],"recommendation":"CASH_ONLY","suggestedRedeem":"-5"}']) {
    const e = await explainRoute(input, { ...cfg, fetchImpl: fakeFetch(content) });
    assert.equal(e.source, "fallback", content);
    assert.match(e.fallbackReason ?? "", /schema/);
  }
});

test("HTTP error or network failure → fallback, never throws", async () => {
  assert.equal((await explainRoute(input, { ...cfg, fetchImpl: fakeFetch("{}", 500) })).fallbackReason, "Qwen HTTP 500");
  const boom = (async () => { throw new TypeError("network"); }) as typeof fetch;
  assert.match((await explainRoute(input, { ...cfg, fetchImpl: boom })).fallbackReason ?? "", /unavailable/);
});

test("blocked route cannot be explained", () => {
  const blocked = computeFundingRoute({ cash: "2000", productive: "3000", redeemable: "3000", obligation: "10000", policy: { minCashBuffer: "0", maxRedeemPerExecution: null, allowedRoutes: ["CashOnly", "CashThenRedeem"] } });
  assert.throws(() => buildAiInput({ route: blocked, obligationTotal: "10000", lineCount: 1, liquidBalance: "2000", productiveBalance: "3000", policy: input.policy }));
});
