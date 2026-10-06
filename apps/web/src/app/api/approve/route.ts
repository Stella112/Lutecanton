import { z } from "zod";
import { isRole } from "@lute/domain";
import { assertSameOrigin, errorResponse, lute } from "@/server/lute";

const Body = z.object({ role: z.string() });

/**
 * Submits Approve as the given role's party. The ledger enforces who may approve:
 * non-approver roles are passed through so that any rejection comes from Daml, not from us.
 */
export async function POST(req: Request) {
  const denied = assertSameOrigin(req);
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isRole(parsed.data.role)) {
    return Response.json({ error: "invalid_request", message: "unknown role" }, { status: 400 });
  }
  try {
    const proposal = await (await lute()).approve(parsed.data.role);
    return Response.json({ proposal });
  } catch (e) {
    return errorResponse(e);
  }
}
