import type { LedgerClient } from "@lute/canton";

export const ROLES = [
  "Treasury",
  "FinanceOp",
  "TreasuryOp",
  "RiskOp",
  "FinanceViewer",
  "Alice",
  "Ben",
  "Chidi",
  "David",
  "Eva",
  "Auditor",
  "FundAgent",
  "CashIssuer",
  "Outsider",
] as const;

export type Role = (typeof ROLES)[number];
export type PartyRegistry = Record<Role, string>;

export const APPROVERS = ["FinanceOp", "TreasuryOp", "RiskOp"] as const satisfies readonly Role[];
export const PAYEES = ["Alice", "Ben", "Chidi", "David", "Eva"] as const satisfies readonly Role[];

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

/** Party hint part of a party id (`hint::fingerprint`). */
export const hintOf = (party: string) => party.split("::")[0] ?? party;

/**
 * Finds the parties for every role among the parties known to the participant.
 * Matches a hint equal to `<prefix><Role>` (case-insensitive), e.g. `lute-Alice`
 * locally or `c2ede6f6-alice` on DevNet (prefix = the team namespace prefix).
 */
export function matchParties(parties: string[], prefix: string): Partial<PartyRegistry> {
  const found: Partial<PartyRegistry> = {};
  for (const role of ROLES) {
    const want = `${prefix}${role}`.toLowerCase();
    const matches = parties.filter((p) => hintOf(p).toLowerCase() === want);
    if (matches.length > 1) throw new Error(`ambiguous parties for role ${role}: ${matches.map(hintOf).join(", ")}`);
    if (matches[0]) found[role] = matches[0];
  }
  return found;
}

/** Sandbox only: allocates missing role parties with hint `<prefix><Role>`. */
export async function ensureParties(client: LedgerClient, prefix: string): Promise<PartyRegistry> {
  const existing = matchParties(await client.listParties(), prefix);
  for (const role of ROLES) {
    existing[role] ??= await client.allocateParty(`${prefix}${role}`);
  }
  return existing as PartyRegistry;
}

/**
 * DevNet: parties are created in the Console, which grants the team user CanActAs.
 * Discovered from the user's own rights (tenant users may not list all parties).
 * Fails clearly if any role party is missing.
 */
export async function discoverParties(client: LedgerClient, prefix: string): Promise<PartyRegistry> {
  const found = matchParties(await client.actAsParties(), prefix);
  const missing = ROLES.filter((r) => !found[r]);
  if (missing.length) {
    throw new Error(`Lute parties missing on the ledger (create them in the NODERS Console): ${missing.map((r) => prefix + r).join(", ")}`);
  }
  return found as PartyRegistry;
}
