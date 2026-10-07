"use client";

import { postJson, useApi, type StateResponse, type ViewResponse } from "@/lib/api";
import { fmt, shortId, who } from "@/lib/format";
import { ActionButton, Badge, Card, ErrorBox, Loading, Row } from "@/components/ui";
import { NetworkBanner } from "@/components/network-banner";

interface Payout {
  lineRef: string;
  payee: string;
  amount: string;
  holding: string;
}

export default function SettlementPage() {
  const st = useApi<StateResponse>("/api/state");
  const fin = useApi<ViewResponse>("/api/view/FinanceViewer");
  const reload = () => {
    void st.reload();
    void fin.reload();
  };
  if ((st.loading && !st.data) || (fin.loading && !fin.data)) return <Loading />;
  if (st.error && !st.data) return <ErrorBox error={st.error} />;
  if (!st.data || !fin.data) return null;
  const { state: s, parties } = st.data;
  const receipts = fin.data.contracts.filter((c) => c.template === "FinanceReceipt");
  const pending = s.proposal;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <NetworkBanner network={st.data.network} instruments={st.data.state.instruments} />
        <h1 className="text-2xl font-semibold tracking-tight text-navy">Settlement</h1>
      </div>

      {pending && (
        <Card title={<>Pending · {pending.payload.batch.batchRef}</>}>
          <p className="mb-3 text-sm text-muted">
            {pending.approvals.length >= pending.requiredApprovals ? "Prepared: approvals met, awaiting execution." : "Pending: awaiting approvals."}
          </p>
          {pending.payload.batch.lines.map((l) => (
            <Row
              key={l.lineRef}
              k={`${l.lineRef} · ${who(l.payee, parties)}`}
              v={
                <>
                  {fmt(l.amount)}{" "}
                  <Badge>{pending.approvals.length >= pending.requiredApprovals ? "Prepared" : "Pending"}</Badge>
                </>
              }
            />
          ))}
        </Card>
      )}

      {receipts.length === 0 && !pending && <Card><p className="text-sm text-muted">No settlements yet.</p></Card>}

      {receipts.map((r) => {
        const payload = r.payload as { batchRef: string; total: string; settledAt: string; plan: Record<string, string>; payouts: Payout[] };
        return (
          <Card key={r.contractId} title={<>Settled · {payload.batchRef} <Badge tone="ok">Verified on ledger</Badge></>}>
            <Row k="Settled at" v={payload.settledAt} />
            <Row k="RWA shortfall funded" v={fmt(payload.plan.redeemAmount)} />
            <Row k="Payments settled" v={payload.payouts.length} />
            <Row k="Finance receipt" v={<span className="font-mono text-xs">{shortId(r.contractId)}</span>} />
            <div className="mt-4">
              {payload.payouts.map((po) => (
                <Row
                  key={po.lineRef}
                  k={`${po.lineRef} · ${who(po.payee, parties)}`}
                  v={
                    <>
                      {fmt(po.amount)} <Badge tone="ok">Settled</Badge>{" "}
                      <span className="font-mono text-xs text-muted">{shortId(po.holding)}</span>
                    </>
                  }
                />
              ))}
            </div>
          </Card>
        );
      })}

      {st.data.network === "local" && (
        <Card title={<>Redemption failure test (S4) <Badge tone="warn">Demo only · MOCK fund agent</Badge></>}>
          <p className="mb-3 text-sm text-muted">
            Facility is {s.facility?.isOpen ? "open" : "closed"}. Close it, then execute: the whole transaction must roll back.
          </p>
          <ActionButton
            label={s.facility?.isOpen ? "Close redemption facility" : "Reopen redemption facility"}
            variant="secondary"
            disabled={!s.facility}
            run={() => postJson("/api/dev/facility", { open: !s.facility?.isOpen })}
            onDone={reload}
          />
        </Card>
      )}
    </div>
  );
}
