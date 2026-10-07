// Template ids by package name (`#package-name:Module:Entity`), the form the
// JSON Ledger API accepts and recommends over package-id references.
const pkg = "#lute-core";

export const T = {
  Holding: `${pkg}:Lute.TestAsset:Holding`,
  RedemptionFacility: `${pkg}:Lute.TestAsset:RedemptionFacility`,
  TreasuryPolicy: `${pkg}:Lute.Policy:TreasuryPolicy`,
  PaymentBatch: `${pkg}:Lute.Workflow:PaymentBatch`,
  ExecutionProposal: `${pkg}:Lute.Workflow:ExecutionProposal`,
  PayeeReceipt: `${pkg}:Lute.Receipts:PayeeReceipt`,
  FinanceReceipt: `${pkg}:Lute.Receipts:FinanceReceipt`,
  AuditReceipt: `${pkg}:Lute.Receipts:AuditReceipt`,
} as const;

export type TemplateName = keyof typeof T;

/** Maps a ledger-returned template id (`<pkgId>:Module:Entity`) to our name. */
export function templateNameOf(templateId: string): TemplateName | null {
  const suffix = templateId.slice(templateId.indexOf(":") + 1);
  for (const [name, id] of Object.entries(T)) {
    if (id.slice(id.indexOf(":") + 1) === suffix) return name as TemplateName;
  }
  return null;
}

/** Test instrument ids for one network. Never named USDCx / USYC. */
export interface Instruments {
  /** Payment asset id. */
  cash: string;
  /** Productive RWA id. */
  rwa: string;
  /** Human label shown in the UI. */
  label: string;
}

// spec §13: MOCK LOCALNET PAYMENT ASSET / MOCK LOCALNET PRODUCTIVE RWA.
export const LOCAL_TEST_ASSETS: Instruments = { cash: "cUSD-L", rwa: "cMMF-L", label: "MOCK LOCALNET" };
// spec §14: DEVNET TEST RWA (no suitable real productive asset verified on DevNet).
export const DEVNET_TEST_ASSETS: Instruments = { cash: "LUTE-USD-DEV", rwa: "LUTE-RWA-DEV", label: "DEVNET TEST" };
