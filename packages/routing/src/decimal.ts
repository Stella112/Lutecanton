// Fixed-point decimal amounts for authoritative treasury math.
//
// Amounts are carried as bigint scaled by 10^SCALE. SCALE matches Daml's
// `Numeric 10` (the scale of `Decimal`), so backend and ledger agree exactly.
// No floating point anywhere. Inputs with more than SCALE fractional digits
// are rejected rather than silently rounded.

export const SCALE = 10;
const FACTOR = 10n ** BigInt(SCALE);

/** Scaled integer amount (value × 10^SCALE). */
export type Amount = bigint;

export class DecimalError extends Error {
  readonly input: string;
  constructor(message: string, input: string) {
    super(message);
    this.name = "DecimalError";
    this.input = input;
  }
}

const DECIMAL_RE = /^(-?)(\d+)(?:\.(\d+))?$/;

/** Parses a decimal string such as "24800" or "4800.25". Rejects negatives and excess precision. */
export function parseAmount(input: string): Amount {
  if (typeof input !== "string") {
    throw new DecimalError("amount must be a decimal string", String(input));
  }
  const m = DECIMAL_RE.exec(input.trim());
  if (!m) throw new DecimalError("not a decimal number", input);
  const [, sign, whole, frac = ""] = m;
  if (sign === "-") throw new DecimalError("negative amounts are not allowed", input);
  if (frac.length > SCALE) {
    throw new DecimalError(`more than ${SCALE} decimal places`, input);
  }
  return BigInt(whole) * FACTOR + BigInt(frac.padEnd(SCALE, "0"));
}

/** Formats a scaled amount as a canonical decimal string without trailing zeros ("4800", "0.5"). */
export function formatAmount(value: Amount): string {
  const neg = value < 0n;
  const abs = neg ? -value : value;
  const whole = abs / FACTOR;
  const frac = (abs % FACTOR).toString().padStart(SCALE, "0").replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole}${frac ? "." + frac : ""}`;
}

export const min = (a: Amount, b: Amount): Amount => (a < b ? a : b);
export const max = (a: Amount, b: Amount): Amount => (a > b ? a : b);
