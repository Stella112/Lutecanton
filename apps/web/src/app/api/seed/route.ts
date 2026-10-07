import { assertSameOrigin, errorResponse, lute } from "@/server/lute";

/**
 * Creates the demo treasury with clearly labelled test assets (no-op if it exists).
 * Allowed on the local sandbox and on DevNet, where all parties are this team's own.
 */
export async function POST(req: Request) {
  const denied = assertSameOrigin(req);
  if (denied) return denied;
  try {
    return Response.json(await (await lute()).seed());
  } catch (e) {
    return errorResponse(e);
  }
}
