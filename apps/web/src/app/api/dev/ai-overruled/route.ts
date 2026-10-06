import { z } from "zod";
import { isLedgerError } from "@lute/canton";
import { assertSameOrigin, demoToolsEnabled, errorResponse, lute } from "@/server/lute";

const Body = z.object({ proposedRedeem: z.string().regex(/^\d+(\.\d{1,10})?$/).default("8000") });

/**
 * DEMO ONLY (spec §35): submits a proposal with an AI-style amount that differs
 * from the verified route. The Daml policy is expected to reject it.
 */
export async function POST(req: Request) {
  const denied = assertSameOrigin(req);
  if (denied) return denied;
  if (!demoToolsEnabled()) return Response.json({ error: "forbidden", message: "demo tools disabled" }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });
  try {
    const l = await lute();
    const st = await l.treasuryState();
    try {
      await l.propose({
        proposedRedeem: parsed.data.proposedRedeem,
        aiNote: { summary: "AI-overruled stress test", recommendedRedeem: parsed.data.proposedRedeem, agreesWithVerified: false },
      });
    } catch (e) {
      if (isLedgerError(e)) {
        return Response.json({
          rejected: true,
          proposedRedeem: parsed.data.proposedRedeem,
          verifiedRedeem: st.route?.redeemAmount ?? null,
          message: e.message,
          traceId: e.traceId,
        });
      }
      throw e;
    }
    // Reaching here means the policy accepted it: report it plainly, never as success.
    return Response.json(
      { rejected: false, proposedRedeem: parsed.data.proposedRedeem, verifiedRedeem: st.route?.redeemAmount ?? null },
      { status: 409 },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
