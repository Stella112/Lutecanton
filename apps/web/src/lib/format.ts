// Display-only formatting. Works on decimal strings so displayed values are
// exactly what the ledger returned (no float rounding).

export function fmt(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  const s = String(amount);
  const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(s);
  if (!m) return s;
  const [, sign, whole, frac = ""] = m;
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  // Keep every significant fractional digit: never round a ledger amount for display.
  const significant = frac.replace(/0+$/, "");
  return `${sign}${grouped}${significant ? `.${significant}` : ""}`;
}

export const shortId = (id: string) => (id.length > 18 ? `${id.slice(0, 10)}…${id.slice(-6)}` : id);

/** Role name for a party id, falling back to a shortened id. */
export function who(party: unknown, labels: Record<string, string>): string {
  const p = String(party);
  return labels[p] ?? shortId(p);
}
