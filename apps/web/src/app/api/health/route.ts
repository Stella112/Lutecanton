import { qwenConfigFromEnv } from "@lute/ai";
import { lute, network } from "@/server/lute";

export const dynamic = "force-dynamic";

type Status = "READY" | "BLOCKED" | "DISABLED" | "MISCONFIGURED" | "UNVERIFIED";

/** Integration health (spec §49). Reports only what was actually checked. */
export async function GET() {
  const checks: Record<string, { status: Status; detail: string }> = {};
  let net: string;
  try {
    net = network();
  } catch (e) {
    return Response.json({ checks: { network: { status: "MISCONFIGURED", detail: String(e) } } });
  }
  try {
    const l = await lute();
    const v = await l.client.version();
    checks.ledger = { status: "READY", detail: `${net}: Canton ${v.version}` };
    checks.parties = { status: "READY", detail: `${Object.keys(l.parties).length} role parties resolved` };
    const st = await l.treasuryState();
    checks.policy = st.policy
      ? { status: "READY", detail: "TreasuryPolicy visible to Treasury" }
      : { status: "BLOCKED", detail: "no policy (seed the demo)" };
    checks.paymentAsset = { status: "READY", detail: `MOCK cUSD-L treasury balance ${st.cash}` };
    checks.productiveAsset = st.facility
      ? { status: "READY", detail: `MOCK cMMF-L ${st.productive}; facility ${st.facility.isOpen ? "open" : "closed"}` }
      : { status: "BLOCKED", detail: "no redemption facility" };
  } catch (e) {
    checks.ledger = { status: "BLOCKED", detail: e instanceof Error ? e.message : String(e) };
  }
  const q = qwenConfigFromEnv();
  checks.qwen =
    q.apiKey && q.baseUrl && q.model
      ? { status: "UNVERIFIED", detail: "configured; deterministic fallback on failure" }
      : { status: "DISABLED", detail: "not configured; deterministic fallback in use" };
  checks.bitsafe = { status: "DISABLED", detail: "native Daml 2-of-3 governance in use" };
  checks.grofty = { status: "UNVERIFIED", detail: "MainNet read-only panel at /mainnet" };
  checks.oneswap = { status: "DISABLED", detail: "not evaluated" };
  return Response.json({ checks });
}
