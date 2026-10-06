"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { errorText, postJson, useApi, type StateResponse } from "@/lib/api";
import { fmt, who } from "@/lib/format";
import { ActionButton, Badge, Card, ErrorBox, Loading, Row } from "@/components/ui";
import { NetworkBanner } from "@/components/network-banner";

interface OverruledResult {
  rejected: boolean;
  proposedRedeem: string;
  verifiedRedeem: string | null;
  message?: string;
}

export default function ReviewPage() {
  const router = useRouter();
  const { data, error, loading, reload } = useApi<StateResponse>("/api/state");
  const [stress, setStress] = useState<OverruledResult | null>(null);
  const [stressError, setStressError] = useState<string | null>(null);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorBox error={error} />;
  if (!data) return null;
  const { state: s, explanation: ex, parties } = data;
  const batch = s.batch?.payload;
  const pol = s.policy?.payload;

  if (!batch || !pol) {
    return (
      <Card>
        <p className="text-sm text-muted">{s.proposal ? "This obligation already has a funding proposal." : "No open obligation to review."}</p>
      </Card>
    );
  }
  const r = s.route;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <NetworkBanner network={data.network} />
        <h1 className="text-2xl font-semibold tracking-tight text-navy">Funding review · {batch.batchRef}</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Obligation">
          <Row k="Payroll period" v={batch.period} />
          <Row k="Payee count" v={batch.lines.length} />
          <Row k="Total" v={fmt(batch.total)} />
          <Row k="Available cash" v={fmt(s.cash)} />
          <Row k="Productive assets" v={fmt(s.productive)} />
          <Row k="Shortfall" v={fmt(r?.shortfall)} />
          <p className="mt-3 text-xs text-muted">Individual payees and amounts are visible to Treasury and Finance only.</p>
        </Card>

        <Card title="Treasury policy (on ledger)">
          <Row k="Approval threshold" v={`${pol.approvalThreshold} of ${(pol.approvers as string[]).length}`} />
          <Row k="Approvers" v={(pol.approvers as string[]).map((a) => who(a, parties)).join(", ")} />
          <Row k="Large-payment threshold" v={fmt(String(pol.largePaymentThreshold))} />
          <Row k="Minimum cash buffer" v={fmt(String(pol.minCashBuffer))} />
          <Row k="Max redemption per execution" v={pol.maxRedeemPerExecution === null ? "none" : fmt(String(pol.maxRedeemPerExecution))} />
          <Row k="Allowed routes" v={(pol.allowedRoutes as string[]).join(", ")} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={<>Deterministic calculation <Badge>{r?.engineVersion ?? "router"}</Badge></>}>
          {r?.route ? (
            <>
              <Row k="Route" v={r.route === "CashThenRedeem" ? "Cash first, then redeem shortfall" : "Cash only"} />
              <Row k="Cash used" v={fmt(r.cashUsed)} />
              <Row k="RWA redemption" v={fmt(r.redeemAmount)} />
              <Row k="Remaining productive" v={<span className="font-semibold text-accent">{fmt(r.remainingProductive)}</span>} />
              <p className="mt-3 text-xs text-muted">The Daml contract recomputes these values from ledger holdings and rejects any other amount.</p>
            </>
          ) : (
            <p className="text-sm text-danger">BLOCKED: {r?.blockedReason}</p>
          )}
        </Card>

        <Card title={<>AI explanation <Badge tone={ex?.source === "qwen" ? "accent" : "neutral"}>{ex?.source === "qwen" ? "Qwen" : "Deterministic fallback"}</Badge></>}>
          {ex ? (
            <>
              <p className="text-sm">{ex.summary}</p>
              {ex.risks.length > 0 && (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
                  {ex.risks.map((risk) => (
                    <li key={risk}>{risk}</li>
                  ))}
                </ul>
              )}
              {!ex.agreesWithVerified && (
                <p className="mt-3 text-sm text-warn">
                  AI suggested {fmt(ex.suggestedRedeem)}; the verified amount {fmt(ex.verifiedRedeem)} is used.
                </p>
              )}
              {ex.fallbackReason && <p className="mt-3 text-xs text-muted">Fallback reason: {ex.fallbackReason}</p>}
              <p className="mt-3 text-xs text-muted">The AI saw totals only, no names or individual amounts. It cannot approve or move funds.</p>
            </>
          ) : (
            <p className="text-sm text-muted">No explanation for a blocked route.</p>
          )}
        </Card>
      </div>

      {r?.route && (
        <ActionButton
          label="Accept funding route"
          run={() => postJson("/api/propose")}
          onDone={() => router.push("/governance")}
        />
      )}

      <Card title={<>AI overruled · stress test <Badge tone="warn">Demo only</Badge></>}>
        <p className="text-sm text-muted">
          Submits a proposal to redeem 8,000 instead of the verified {fmt(r?.redeemAmount)}. Treasury policy on the ledger must reject it.
        </p>
        <button
          className="mt-3 rounded-md border border-line px-3 py-1.5 text-sm"
          onClick={async () => {
            setStressError(null);
            try {
              setStress(await postJson<OverruledResult>("/api/dev/ai-overruled", { proposedRedeem: "8000" }));
            } catch (e) {
              setStressError(errorText(e));
            }
            void reload();
          }}
        >
          Submit AI proposal of 8,000
        </button>
        {stressError && <p className="mt-2 text-sm text-danger">{stressError}</p>}
        {stress && (
          <div className="mt-4 rounded border border-line p-4">
            <Row k="AI proposal" v={fmt(stress.proposedRedeem)} />
            <Row k="Policy maximum (verified)" v={fmt(stress.verifiedRedeem)} />
            <p className={`mt-3 text-sm font-semibold uppercase tracking-wider ${stress.rejected ? "text-danger" : "text-warn"}`}>
              {stress.rejected ? "Rejected by treasury policy" : "Not rejected: investigate"}
            </p>
            {stress.message && <p className="mt-1 break-words font-mono text-xs text-muted">{stress.message}</p>}
          </div>
        )}
      </Card>
    </div>
  );
}
