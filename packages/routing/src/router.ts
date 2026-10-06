// Deterministic funding router (spec §18, §38).
//
// Cash first; redeem only the exact shortfall from the productive asset.
// This is the authoritative off-ledger calculation. The Daml model recomputes
// the same rules at execution time; any disagreement is a blocker (spec §19, §47).
// No AI input is accepted here.

import { type Amount, formatAmount, max, min, parseAmount } from "./decimal.ts";

export const ENGINE_VERSION = "lute-router/1";

export type Route = "CashOnly" | "CashThenRedeem";

export type BlockedReason =
  | "ZERO_OBLIGATION"
  | "ROUTE_NOT_ALLOWED"
  | "INSUFFICIENT_LIQUIDITY"
  | "REDEMPTION_CAP_EXCEEDED";

export interface RoutingPolicy {
  /** Cash that must remain untouched after funding. "0" disables the buffer. */
  minCashBuffer: string;
  /** Maximum productive-asset redemption per execution; null means no cap. */
  maxRedeemPerExecution: string | null;
  allowedRoutes: readonly Route[];
}

export interface RoutingInput {
  /** Liquid payment-asset balance. */
  cash: string;
  /** Total productive-asset position. */
  productive: string;
  /** Portion of the productive position that can be redeemed now (≤ productive). */
  redeemable: string;
  /** Obligation total, e.g. a payroll batch. */
  obligation: string;
  policy: RoutingPolicy;
}

export interface RoutingResult {
  engineVersion: string;
  /** Null when blocked. */
  route: Route | null;
  blockedReason: BlockedReason | null;
  cashAvailable: string;
  cashUsed: string;
  shortfall: string;
  redeemAmount: string;
  remainingProductive: string;
}

export class RoutingInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoutingInputError";
  }
}

/**
 * Computes the funding route. Throws RoutingInputError for malformed input
 * (negative, non-decimal, inconsistent balances); returns a blocked result for
 * valid input that cannot be funded under policy. When blocked, nothing is
 * redeemed: redeemAmount is "0" and remainingProductive equals the position.
 */
export function computeFundingRoute(input: RoutingInput): RoutingResult {
  const cash = parseAmount(input.cash);
  const productive = parseAmount(input.productive);
  const redeemable = parseAmount(input.redeemable);
  const obligation = parseAmount(input.obligation);
  const buffer = parseAmount(input.policy.minCashBuffer);
  const cap = input.policy.maxRedeemPerExecution === null ? null : parseAmount(input.policy.maxRedeemPerExecution);

  if (redeemable > productive) {
    throw new RoutingInputError("redeemable amount exceeds productive position");
  }

  const cashAvailable = max(0n, cash - buffer);
  const cashUsed = min(cashAvailable, obligation);
  const shortfall = obligation - cashUsed;

  const blocked = (reason: BlockedReason): RoutingResult =>
    result(null, reason, cashAvailable, cashUsed, shortfall, 0n, productive);

  if (obligation === 0n) return blocked("ZERO_OBLIGATION");

  if (shortfall === 0n) {
    if (!input.policy.allowedRoutes.includes("CashOnly")) return blocked("ROUTE_NOT_ALLOWED");
    return result("CashOnly", null, cashAvailable, cashUsed, 0n, 0n, productive);
  }

  if (!input.policy.allowedRoutes.includes("CashThenRedeem")) return blocked("ROUTE_NOT_ALLOWED");
  if (shortfall > redeemable) return blocked("INSUFFICIENT_LIQUIDITY");
  if (cap !== null && shortfall > cap) return blocked("REDEMPTION_CAP_EXCEEDED");

  return result("CashThenRedeem", null, cashAvailable, cashUsed, shortfall, shortfall, productive - shortfall);
}

function result(
  route: Route | null,
  blockedReason: BlockedReason | null,
  cashAvailable: Amount,
  cashUsed: Amount,
  shortfall: Amount,
  redeemAmount: Amount,
  remainingProductive: Amount,
): RoutingResult {
  return {
    engineVersion: ENGINE_VERSION,
    route,
    blockedReason,
    cashAvailable: formatAmount(cashAvailable),
    cashUsed: formatAmount(cashUsed),
    shortfall: formatAmount(shortfall),
    redeemAmount: formatAmount(redeemAmount),
    remainingProductive: formatAmount(remainingProductive),
  };
}

export type ProposalCheck =
  | { accepted: true }
  | { accepted: false; reason: "ROUTE_BLOCKED" | "AMOUNT_MISMATCH"; verifiedRedeem: string; proposedRedeem: string };

/**
 * Checks an externally proposed redemption (e.g. from the AI layer) against the
 * verified route. Only the exact verified amount is acceptable (spec §34, §35).
 */
export function checkProposedRedemption(verified: RoutingResult, proposedRedeem: string): ProposalCheck {
  const proposed = parseAmount(proposedRedeem);
  const verifiedRedeem = parseAmount(verified.redeemAmount);
  if (verified.route === null) {
    return { accepted: false, reason: "ROUTE_BLOCKED", verifiedRedeem: verified.redeemAmount, proposedRedeem: formatAmount(proposed) };
  }
  if (proposed !== verifiedRedeem) {
    return { accepted: false, reason: "AMOUNT_MISMATCH", verifiedRedeem: verified.redeemAmount, proposedRedeem: formatAmount(proposed) };
  }
  return { accepted: true };
}
