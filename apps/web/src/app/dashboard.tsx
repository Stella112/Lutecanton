"use client";

import Link from "next/link";
import { postJson, useApi, type StateResponse } from "@/lib/api";
import { fmt } from "@/lib/format";
import { ActionButton, Badge, Card, ErrorBox, Loading, Row, Stat } from "@/components/ui";
import { NetworkBanner } from "@/components/network-banner";

export function Dashboard() {
  const { data, error, loading, reload } = useApi<StateResponse>("/api/state");
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorBox error={error} />;
  if (!data) return null;
  const { state: s, explanation: ex } = data;
  const obligation = s.batch?.payload ?? s.proposal?.payload.batch ?? null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <NetworkBanner network={data.network} instruments={data.state.instruments} />
        <h1 className="text-2xl font-semibold tracking-tight text-navy">Treasury</h1>
      </div>

      {!s.policy && (
        <Card>
          <p className="text-sm text-muted">This ledger has no Lute treasury yet for these parties.</p>
          <div className="mt-3">
            <ActionButton label={`Create demo treasury (${s.instruments.label} assets)`} run={() => postJson("/api/seed")} onDone={reload} />
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><Stat label="Liquid payment asset" value={fmt(s.cash)} note={`${s.instruments.cash} · ${s.instruments.label} payment asset`} /></Card>
        <Card><Stat label="Productive assets" value={fmt(s.productive)} note={`${s.instruments.rwa} · ${s.instruments.label} productive RWA`} /></Card>
        <Card><Stat label="Total treasury" value={fmt(s.total)} /></Card>
      </div>

      {obligation && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Upcoming obligation">
            <Row k="Batch" v={obligation.batchRef} />
            <Row k="Period" v={obligation.period} />
            <Row k="Payees" v={obligation.lines.length} />
            <Row k="Total" v={fmt(obligation.total)} />
            <Row
              k="Funding status"
              v={
                s.proposal ? (
                  <Badge tone="accent">Awaiting approvals {s.proposal.approvals.length}/{s.proposal.requiredApprovals}</Badge>
                ) : s.route?.route ? (
                  <Badge tone="warn">Needs funding route</Badge>
                ) : (
                  <Badge tone="danger">Blocked: {s.route?.blockedReason}</Badge>
                )
              }
            />
          </Card>

          <Card title={<>Lute AI · funding route <span className="ml-1 normal-case tracking-normal">({ex?.source === "qwen" ? "Qwen" : "deterministic explanation"})</span></>}>
            {s.route?.route ? (
              <>
                <p className="text-sm">
                  Liquidity shortfall: <span className="font-semibold tabular-nums">{fmt(s.route.shortfall)}</span>
                </p>
                <div className="mt-3">
                  <Row k="Cash" v={fmt(s.route.cashUsed)} />
                  <Row k="RWA redemption" v={fmt(s.route.redeemAmount)} />
                </div>
                <p className="mt-3 text-sm font-medium text-accent">{fmt(s.route.remainingProductive)} remains productive.</p>
                {ex && <p className="mt-3 text-sm text-muted">{ex.summary}</p>}
                {!s.proposal && (
                  <Link href="/review" className="mt-4 inline-block rounded-md bg-navy px-4 py-2 text-sm font-medium text-background">
                    Review route
                  </Link>
                )}
              </>
            ) : (
              <p className="text-sm text-danger">No valid route: {s.route?.blockedReason ?? "no obligation"}.</p>
            )}
          </Card>
        </div>
      )}

      {!obligation && s.policy && (
        <Card>
          <p className="text-sm text-muted">
            No open obligation. {s.financeReceipts > 0 && <Link href="/privacy" className="text-accent hover:underline">See settled receipts →</Link>}
          </p>
          <div className="mt-4">
            <ActionButton
              label={`Start new payroll run (${s.instruments.label} assets)`}
              variant="secondary"
              run={() => postJson("/api/new-run")}
              onDone={reload}
            />
            <p className="mt-2 text-xs text-muted">
              Demo replay: the test issuers top the treasury back up to 20,000 cash and 15,000 productive, and a new 24,800 batch opens.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
