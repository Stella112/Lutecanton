import { z } from "zod";
import { assertSameOrigin, demoToolsEnabled, errorResponse, lute } from "@/server/lute";

const Body = z.object({ open: z.boolean() });

/** DEMO ONLY: the MOCK fund agent opens or closes its redemption facility (S4). */
export async function POST(req: Request) {
  const denied = assertSameOrigin(req);
  if (denied) return denied;
  if (!demoToolsEnabled()) return Response.json({ error: "forbidden", message: "demo tools disabled" }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });
  try {
    await (await lute()).setFacilityOpen(parsed.data.open);
    return Response.json({ open: parsed.data.open });
  } catch (e) {
    return errorResponse(e);
  }
}
