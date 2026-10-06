import { assertSameOrigin, errorResponse, explain, lute } from "@/server/lute";

/** Proposes the verified route. The AI note is recorded but never sets the amount. */
export async function POST(req: Request) {
  const denied = assertSameOrigin(req);
  if (denied) return denied;
  try {
    const l = await lute();
    const ex = await explain(l);
    const proposal = await l.propose({
      aiNote: ex ? { summary: ex.summary, recommendedRedeem: ex.suggestedRedeem, agreesWithVerified: ex.agreesWithVerified } : undefined,
    });
    return Response.json({ proposal });
  } catch (e) {
    return errorResponse(e);
  }
}
