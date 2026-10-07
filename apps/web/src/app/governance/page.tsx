"use client";

import { useRouter } from "next/navigation";
import { postJson, useApi, type StateResponse } from "@/lib/api";
import { fmt, who } from "@/lib/format";
import { ActionButton, Badge, Card, ErrorBox, Loading, Row } from "@/components/ui";
import { NetworkBanner } from "@/components/network-banner";

const OPERATORS = ["FinanceOp", "TreasuryOp", "RiskOp"] as const;

export default function GovernancePage() {
  const router = useRouter();
  const { data, error, loading, reload } = useApi<StateResponse>("/api/state");
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorBox error={error} />;
  if (!data) return null;
  const p = data.state.proposal;
  if (!p) {
    return (
      <Card>
        <p className="text-sm text-muted">No proposal awaiting approval. Accept a funding route on the Review page first.</p>
      </Card>
    );
  }
  const approvedRoles = new Set(p.approvals.map((a) => who(a, data.parties)));
  const reached = p.approvals.length >= p.requiredApprovals;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <NetworkBanner network={data.network} instruments={data.state.instruments} />
        <h1 className="text-2xl font-semibold tracking-tight text-navy">Governance · {p.payload.batch.batchRef}</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Approval status (from the ledger)">
          <Row k="Threshold" v={`${p.requiredApprovals} of ${p.payload.approvers.length}`} />
          {OPERATORS.map((op) => (
            <Row key={op} k={op} v={approvedRoles.has(op) ? <Badge tone="ok">Approved</Badge> : <Badge>Pending</Badge>} />
          ))}
          <p className={`mt-3 text-sm font-semibold ${reached ? "text-accent" : "text-warn"}`}>
            {p.approvals.length} / {p.requiredApprovals} {reached ? "reached: execution enabled" : "reached: execution blocked"}
          </p>
        </Card>

        <Card title="Proposal">
          <Row k="Total" v={fmt(p.payload.batch.total)} />
          <Row k="Cash used" v={fmt(p.payload.plan.cashUsed)} />
          <Row k="RWA redemption" v={fmt(p.payload.plan.redeemAmount)} />
          <Row k="Remaining productive" v={fmt(p.payload.plan.remainingProductive)} />
          <Row k="Engine" v={p.payload.plan.engineVersion} />
        </Card>
      </div>

      <Card title={<>Approve as <Badge tone="warn">Demo role switcher, not authentication</Badge></>}>
        <p className="mb-4 text-sm text-muted">
          Each button submits <code>Approve</code> on the ledger acting as that party. Daml decides whether it counts.
        </p>
        <div className="flex flex-wrap gap-4">
          {OPERATORS.map((op) => (
            <ActionButton
              key={op}
              label={`Approve as ${op}`}
              variant="secondary"
              disabled={approvedRoles.has(op)}
              run={() => postJson("/api/approve", { role: op })}
              onDone={reload}
            />
          ))}
          <ActionButton label="Approve as Outsider (S3)" variant="danger" run={() => postJson("/api/approve", { role: "Outsider" })} onDone={reload} />
        </div>
      </Card>

      <Card title="Execute">
        <p className="mb-4 text-sm text-muted">
          Treasury submits one atomic transaction: redeem the exact shortfall, pay every line, create receipts. The contract
          rejects it below the threshold.
        </p>
        <ActionButton label="Execute settlement" run={() => postJson("/api/execute")} onDone={() => router.push("/settlement")} />
      </Card>
    </div>
  );
}
