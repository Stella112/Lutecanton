"use client";

import { useState } from "react";
import { useApi, type ContractView, type ViewResponse } from "@/lib/api";
import { fmt, shortId, who } from "@/lib/format";
import { Badge, Card, Row } from "@/components/ui";

const DEFAULT_COLUMNS = ["FinanceViewer", "Alice", "Auditor", "Outsider"];
const ALL_ROLES = ["Treasury", "FinanceViewer", "FinanceOp", "TreasuryOp", "RiskOp", "Alice", "Ben", "Chidi", "David", "Eva", "Auditor", "FundAgent", "CashIssuer", "Outsider"];
const TITLES: Record<string, string> = { FinanceViewer: "Finance" };

export default function PrivacyPage() {
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-navy">Privacy comparison</h1>
        <p className="text-sm text-muted">
          Each column is a separate ledger query filtered to that one party. The participant decides what each party may see;
          nothing is hidden in the browser.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((role, i) => (
          <Column key={`${i}-${role}`} role={role} onChange={(r) => setColumns(columns.map((c, j) => (j === i ? r : c)))} />
        ))}
      </div>
      <p className="text-center text-lg font-medium text-navy">Same financial event. Different authorized views.</p>
    </div>
  );
}

function Column({ role, onChange }: { role: string; onChange: (role: string) => void }) {
  const { data, error, loading } = useApi<ViewResponse>(`/api/view/${role}`);
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <select
          value={role}
          onChange={(e) => onChange(e.target.value)}
          className="rounded border border-line bg-surface px-2 py-1 text-sm font-semibold"
          aria-label="Role"
        >
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>
              {TITLES[r] ?? r}
            </option>
          ))}
        </select>
        {data && <Badge tone={data.contracts.length ? "accent" : "neutral"}>{data.contracts.length} visible</Badge>}
      </div>
      {loading && !data && <p className="text-sm text-muted">Querying as {role}…</p>}
      {error && <p className="text-sm text-danger">{error.message ?? error.error}</p>}
      {data && data.contracts.length === 0 && <p className="py-6 text-center text-sm text-muted">Nothing. This party sees no Lute state.</p>}
      <div className="space-y-3">
        {data?.contracts.map((c) => <ContractCard key={c.contractId} c={c} labels={data.parties} />)}
      </div>
    </Card>
  );
}

function ContractCard({ c, labels }: { c: ContractView; labels: Record<string, string> }) {
  const p = c.payload as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const head = (title: string, tone: "accent" | "neutral" = "neutral") => (
    <div className="mb-2 flex items-center justify-between">
      <span className="text-sm font-semibold">{title}</span>
      <Badge tone={tone}>{c.template}</Badge>
    </div>
  );
  const box = "rounded border border-line p-3";
  switch (c.template) {
    case "PayeeReceipt":
      return (
        <div className={box}>
          {head("Payment receipt", "accent")}
          <Row k="Employer" v={p.employer} />
          <Row k="Reference" v={`${p.batchRef} / ${p.lineRef}`} />
          <Row k="Period" v={p.period} />
          <Row k="Amount" v={`${fmt(p.amount)} ${p.paymentInstrument}`} />
          <Row k="State" v={<Badge tone="ok">{p.settlementState}</Badge>} />
        </div>
      );
    case "FinanceReceipt":
      return (
        <div className={box}>
          {head("Finance receipt", "accent")}
          <Row k="Batch" v={p.batchRef} />
          <Row k="Total" v={fmt(p.total)} />
          <Row k="Route" v={`cash ${fmt(p.plan.cashUsed)} + redeem ${fmt(p.plan.redeemAmount)}`} />
          <Row k="Approvals" v={(p.approvals as string[]).map((a) => who(a, labels)).join(", ")} />
          {(p.payouts as { lineRef: string; payee: string; amount: string }[]).map((po) => (
            <Row key={po.lineRef} k={who(po.payee, labels)} v={fmt(po.amount)} />
          ))}
        </div>
      );
    case "AuditReceipt":
      return (
        <div className={box}>
          {head("Audit receipt", "accent")}
          <Row k="Batch" v={p.batchRef} />
          <Row k="Aggregate total" v={fmt(p.total)} />
          <Row k="Line count" v={p.lineCount} />
          <Row k="Route" v={`${p.route} · redeemed ${fmt(p.redeemAmount)}`} />
          <Row k="Policy version" v={p.policyVersion} />
          <Row k="Approvals" v={`${(p.approvals as string[]).length} of required ${p.requiredApprovals}`} />
          <Row k="State" v={<Badge tone="ok">{p.settlementState}</Badge>} />
        </div>
      );
    case "Holding":
      return (
        <div className={box}>
          {head("Holding")}
          <Row k="Instrument" v={`${p.instrument} (test asset)`} />
          <Row k="Amount" v={fmt(p.amount)} />
          <Row k="Owner" v={who(p.owner, labels)} />
        </div>
      );
    case "PaymentBatch":
      return (
        <div className={box}>
          {head("Payment batch")}
          <Row k="Batch" v={p.batchRef} />
          <Row k="Lines" v={(p.lines as unknown[]).length} />
          <Row k="Total" v={fmt(p.total)} />
        </div>
      );
    default:
      return (
        <div className={box}>
          {head(c.template)}
          <p className="font-mono text-xs text-muted">{shortId(c.contractId)}</p>
        </div>
      );
  }
}
