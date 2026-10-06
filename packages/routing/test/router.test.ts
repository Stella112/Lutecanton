import { test } from "node:test";
import assert from "node:assert/strict";
import {
  type RoutingInput,
  checkProposedRedemption,
  computeFundingRoute,
  DecimalError,
  formatAmount,
  parseAmount,
  RoutingInputError,
} from "../src/index.ts";
import { defaultPolicy, fixtureCases, toRoutingInput } from "./fixtures.ts";

const input = (cash: string, productive: string, obligation: string, extra: Partial<RoutingInput> = {}): RoutingInput => ({
  cash,
  productive,
  redeemable: productive,
  obligation,
  policy: defaultPolicy,
  ...extra,
});

// Shared with the Daml model via scripts/gen-daml-routing-cases.mjs.
for (const c of fixtureCases) {
  test(c.name, () => {
    const r = computeFundingRoute(toRoutingInput(c));
    assert.equal(r.route, c.expect.route);
    assert.equal(r.blockedReason, c.expect.blockedReason ?? null);
    assert.equal(r.cashUsed, c.expect.cashUsed);
    assert.equal(r.shortfall, c.expect.shortfall);
    assert.equal(r.redeemAmount, c.expect.redeemAmount);
    assert.equal(r.remainingProductive, c.expect.remainingProductive);
  });
}

test("invariant: cashUsed + redeem = obligation whenever a route exists", () => {
  for (const c of fixtureCases) {
    const r = computeFundingRoute(toRoutingInput(c));
    if (r.route === null) continue;
    assert.equal(parseAmount(r.cashUsed) + parseAmount(r.redeemAmount), parseAmount(c.input.obligation));
  }
});

test("negative inputs are rejected", () => {
  assert.throws(() => computeFundingRoute(input("-1", "15000", "24800")), DecimalError);
  assert.throws(() => computeFundingRoute(input("20000", "15000", "-24800")), DecimalError);
});

test("malformed inputs are rejected", () => {
  for (const bad of ["", "abc", "1e5", "1,000", "NaN", "12.", ".5"]) {
    assert.throws(() => computeFundingRoute(input(bad, "15000", "24800")), DecimalError, bad);
  }
});

test("more than 10 decimal places is rejected, not rounded", () => {
  assert.throws(() => computeFundingRoute(input("1.00000000001", "15000", "24800")), DecimalError);
});

test("redeemable greater than productive is rejected", () => {
  assert.throws(() => computeFundingRoute(input("1", "100", "50", { redeemable: "101" })), RoutingInputError);
});

test("decimal format round-trips canonically", () => {
  assert.equal(formatAmount(parseAmount("004800.2500")), "4800.25");
  assert.equal(formatAmount(parseAmount("0")), "0");
});

test("S5 AI overruled: 8000 proposal rejected against verified 4800", () => {
  const verified = computeFundingRoute(input("20000", "15000", "24800"));
  assert.deepEqual(checkProposedRedemption(verified, "8000"), {
    accepted: false, reason: "AMOUNT_MISMATCH", verifiedRedeem: "4800", proposedRedeem: "8000",
  });
  assert.deepEqual(checkProposedRedemption(verified, "4800.0"), { accepted: true });
});

test("proposal against a blocked route is rejected", () => {
  const verified = computeFundingRoute(input("2000", "3000", "10000"));
  assert.equal(checkProposedRedemption(verified, "3000").accepted, false);
});
