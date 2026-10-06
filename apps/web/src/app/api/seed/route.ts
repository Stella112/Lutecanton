import { assertSameOrigin, errorResponse, lute, network } from "@/server/lute";

/** Local sandbox only: creates the MOCK demo world (no-op if it exists). */
export async function POST(req: Request) {
  const denied = assertSameOrigin(req);
  if (denied) return denied;
  if (network() !== "local") return Response.json({ error: "forbidden", message: "seeding is local-only" }, { status: 403 });
  try {
    return Response.json(await (await lute()).seed());
  } catch (e) {
    return errorResponse(e);
  }
}
