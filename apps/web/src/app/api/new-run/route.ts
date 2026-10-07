import { assertSameOrigin, errorResponse, lute } from "@/server/lute";

/** Demo replay: tops the TEST treasury back up and opens a new payroll batch. */
export async function POST(req: Request) {
  const denied = assertSameOrigin(req);
  if (denied) return denied;
  try {
    return Response.json(await (await lute()).startNewRun());
  } catch (e) {
    return errorResponse(e);
  }
}
