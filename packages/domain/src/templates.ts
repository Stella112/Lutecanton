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

// MOCK instrument ids (spec §13). Never call these USDCx / USYC.
export const MOCK_CASH = "cUSD-L";
export const MOCK_RWA = "cMMF-L";
