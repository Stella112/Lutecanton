import { isRole } from "@lute/domain";
import { errorResponse, lute, partyLabels } from "@/server/lute";

export const dynamic = "force-dynamic";

/** Exactly the active contracts the ledger shows this one party (spec §37). */
export async function GET(_req: Request, ctx: RouteContext<"/api/view/[role]">) {
  const { role } = await ctx.params;
  if (!isRole(role)) return Response.json({ error: "invalid_request", message: "unknown role" }, { status: 400 });
  try {
    const l = await lute();
    return Response.json({ role, party: l.parties[role], parties: partyLabels(l.parties), contracts: await l.roleView(role) });
  } catch (e) {
    return errorResponse(e);
  }
}
