import { errorResponse, explain, lute, network, partyLabels } from "@/server/lute";

export const dynamic = "force-dynamic";

/** Treasury state (Treasury's own ledger view), verified route, and advisory explanation. */
export async function GET() {
  try {
    const l = await lute();
    const [state, explanation] = await Promise.all([l.treasuryState(), explain(l)]);
    return Response.json({ network: network(), parties: partyLabels(l.parties), state, explanation });
  } catch (e) {
    return errorResponse(e);
  }
}
