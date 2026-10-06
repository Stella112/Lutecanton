// End-to-end tests against a running Canton ledger (local sandbox).
// Skipped unless LUTE_LEDGER_URL is set, e.g. LUTE_LEDGER_URL=http://localhost:6864
// Each test uses a fresh party prefix, so runs never interfere on a shared ledger.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LedgerClient, LedgerError } from "@lute/canton";
import { DEMO, ensureParties, LuteLedger, PAYEES, type Role } from "../src/index.ts";

const url = process.env.LUTE_LEDGER_URL;
const skip = url ? false : "set LUTE_LEDGER_URL to run ledger e2e tests";

async function world(name: string, scenario = DEMO) {
  const client = new LedgerClient({ baseUrl: url!, userId: "lute-e2e" });
  await client.uploadDar(readFileSync(new URL("../../../dist/lute-core-0.1.0.dar", import.meta.url)));
  const prefix = `e2e${Date.now().toString(36)}${name}-`;
  const lute = new LuteLedger(client, await ensureParties(client, prefix));
  await lute.seed(scenario);
  return lute;
}

const templatesOf = async (lute: LuteLedger, role: Role) => (await lute.roleView(role)).map((c) => c.template).sort();

test("S1+S6 on a live ledger: exact-shortfall route, 2-of-3, atomic execution, per-party views", { skip }, async () => {
  const lute = await world("s1");
  const before = await lute.treasuryState();
  assert.equal(before.cash, "20000");
  assert.equal(before.productive, "15000");
  assert.equal(before.route?.redeemAmount, "4800");
  assert.equal(before.route?.remainingProductive, "10200");

  await lute.propose();
  await lute.approve("FinanceOp");
  await assert.rejects(lute.execute(), LedgerError, "one approval must not execute");
  await lute.approve("TreasuryOp");
  const { updateId } = await lute.execute();
  assert.ok(updateId);

  const after = await lute.treasuryState();
  assert.equal(after.cash, "0");
  assert.equal(after.productive, "10200");

  // Each payee: exactly its own receipt + holding.
  for (const [i, payee] of PAYEES.entries()) {
    const view = await lute.roleView(payee);
    const receipts = view.filter((c) => c.template === "PayeeReceipt");
    assert.equal(receipts.length, 1, `${payee} receipt count`);
    assert.equal(receipts[0]!.payload.payee, lute.parties[payee]);
    assert.equal(Number(receipts[0]!.payload.amount), Number(DEMO.amounts[i]));
    assert.ok(view.every((c) => c.template === "PayeeReceipt" || (c.template === "Holding" && c.payload.owner === lute.parties[payee])), `${payee} sees only own contracts`);
  }
  assert.deepEqual(await templatesOf(lute, "Auditor"), ["AuditReceipt"]);
  assert.deepEqual(await templatesOf(lute, "Outsider"), []);
  const fin = (await lute.roleView("FinanceViewer")).filter((c) => c.template === "FinanceReceipt");
  assert.equal((fin[0]!.payload.payouts as unknown[]).length, 5);
  const agent = await lute.roleView("FundAgent");
  assert.ok(agent.every((c) => c.template === "Holding" || c.template === "RedemptionFacility"), "fund agent sees no payroll");
  assert.ok(agent.every((c) => !PAYEES.some((r) => c.payload.owner === lute.parties[r])), "fund agent sees no payee holdings");
});

test("S5 on a live ledger: AI-proposed 8,000 is rejected by Daml policy", { skip }, async () => {
  const lute = await world("s5");
  await assert.rejects(
    lute.propose({ proposedRedeem: "8000", aiNote: { summary: "redeem 8000", recommendedRedeem: "8000", agreesWithVerified: false } }),
    (e: unknown) => e instanceof LedgerError && /rejected by treasury policy/.test(e.message),
  );
  await lute.propose(); // verified amount accepted
});

test("S4 on a live ledger: closed facility rolls back the whole execution", { skip }, async () => {
  const lute = await world("s4");
  await lute.propose();
  await lute.approve("FinanceOp");
  await lute.approve("RiskOp");
  await lute.setFacilityOpen(false);
  await assert.rejects(lute.execute(), (e: unknown) => e instanceof LedgerError && /redemption facility is closed/.test(e.message));
  const st = await lute.treasuryState();
  assert.equal(st.cash, "20000");
  assert.equal(st.productive, "15000");
  assert.ok(st.proposal, "proposal still pending");
  for (const payee of PAYEES) assert.deepEqual(await templatesOf(lute, payee), []);
});
