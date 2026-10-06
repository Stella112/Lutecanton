import { assertSameOrigin, errorResponse, lute } from "@/server/lute";

/** Treasury executes; Daml rejects unless approvals meet the threshold and funding still verifies. */
export async function POST(req: Request) {
  const denied = assertSameOrigin(req);
  if (denied) return denied;
  try {
    return Response.json(await (await lute()).execute());
  } catch (e) {
    return errorResponse(e);
  }
}
