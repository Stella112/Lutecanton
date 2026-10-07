// Lute treasury workflow on a Canton ledger via the JSON Ledger API.
//
// Every read is made as one specific party (`activeContractsFor`), so each role
// sees exactly the ledger's projection for that party. Authoritative checks
// happen in Daml; the router here only *proposes* the verified numbers.

import { type ActiveContract, LedgerClient, LedgerError, toDisclosed } from "@lute/canton";
import { computeFundingRoute, formatAmount, parseAmount, type RoutingResult } from "@lute/routing";
import { APPROVERS, PAYEES, type PartyRegistry, type Role } from "./parties.ts";
import { type Instruments, LOCAL_TEST_ASSETS, T, type TemplateName, templateNameOf } from "./templates.ts";

export interface Scenario {
  batchRef: string;
  period: string;
  cash: string;
  rwa: string;
  /** Line amounts for Alice, Ben, Chidi, David, Eva in order. */
  amounts: string[];
  capacity: string;
  fundLiquidity: string;
  minCashBuffer: string;
  maxRedeemPerExecution: string | null;
}

/** Spec §6 demo: 20,000 cash, 15,000 productive, 24,800 payroll. */
export const DEMO: Scenario = {
  batchRef: "PAY-2026-10",
  period: "2026-10",
  cash: "20000",
  rwa: "15000",
  amounts: ["5200", "4800", "5000", "4600", "5200"],
  capacity: "50000",
  fundLiquidity: "100000",
  minCashBuffer: "0",
  maxRedeemPerExecution: null,
};

export interface AiNoteInput {
  summary: string;
  recommendedRedeem: string | null;
  agreesWithVerified: boolean;
}

export interface ContractView {
  template: TemplateName | "Unknown";
  contractId: string;
  payload: Record<string, unknown>;
  signatories: string[];
  observers: string[];
}

export interface TreasuryState {
  instruments: Instruments;
  cash: string;
  productive: string;
  total: string;
  facility: { contractId: string; isOpen: boolean; capacity: string } | null;
  policy: { contractId: string; payload: Record<string, unknown> } | null;
  batch: { contractId: string; payload: Record<string, unknown> } | null;
  proposal: { contractId: string; payload: Record<string, unknown>; approvals: string[]; requiredApprovals: number } | null;
  route: RoutingResult | null;
  financeReceipts: number;
}

const dec = (s: string) => formatAmount(parseAmount(s));
const sumAmounts = (xs: string[]) => formatAmount(xs.reduce((a, x) => a + parseAmount(x), 0n));

export class LuteLedger {
  readonly client: LedgerClient;
  readonly parties: PartyRegistry;
  readonly instruments: Instruments;

  constructor(client: LedgerClient, parties: PartyRegistry, instruments: Instruments = LOCAL_TEST_ASSETS) {
    this.client = client;
    this.parties = parties;
    this.instruments = instruments;
  }

  private async as(role: Role, templates?: TemplateName[], blob = false): Promise<ActiveContract[]> {
    return this.client.activeContractsFor(this.parties[role], {
      templateIds: templates?.map((t) => T[t]),
      includeCreatedEventBlob: blob,
    });
  }

  private submit(role: Role, commandId: string, commands: Parameters<LedgerClient["submit"]>[0]["commands"], extra: Partial<Parameters<LedgerClient["submit"]>[0]> = {}) {
    return this.client.submit({ actAs: [this.parties[role]], commandId, commands, ...extra });
  }

  /** Creates the demo world unless a policy already exists. Each actor submits its own creates. */
  async seed(s: Scenario = DEMO): Promise<{ seeded: boolean; batchRef: string }> {
    const p = this.parties;
    if ((await this.as("Treasury", ["TreasuryPolicy"])).length > 0) return { seeded: false, batchRef: s.batchRef };
    const create = (templateId: string, createArguments: Record<string, unknown>) => ({ CreateCommand: { templateId, createArguments } });
    const holding = (issuer: string, owner: string, instrument: string, amount: string) =>
      create(T.Holding, { issuer, owner, instrument, amount: dec(amount) });
    const tag = `seed-${s.batchRef}`;

    await this.submit("Treasury", `${tag}-policy`, [
      create(T.TreasuryPolicy, {
        treasury: p.Treasury,
        organizationName: "Lute Demo Co (TEST)",
        financeViewer: p.FinanceViewer,
        approvers: APPROVERS.map((r) => p[r]),
        approvalThreshold: "2",
        largePaymentThreshold: "10000",
        minCashBuffer: dec(s.minCashBuffer),
        maxRedeemPerExecution: s.maxRedeemPerExecution === null ? null : dec(s.maxRedeemPerExecution),
        allowedRoutes: ["CashOnly", "CashThenRedeem"],
        paymentInstrument: { issuer: p.CashIssuer, id: this.instruments.cash },
        productiveInstrument: { issuer: p.FundAgent, id: this.instruments.rwa },
        auditor: p.Auditor,
        version: "1",
      }),
    ]);
    if (parseAmount(s.cash) > 0n) await this.submit("CashIssuer", `${tag}-cash`, [holding(p.CashIssuer, p.Treasury, this.instruments.cash, s.cash)]);
    if (parseAmount(s.rwa) > 0n) await this.submit("FundAgent", `${tag}-rwa`, [holding(p.FundAgent, p.Treasury, this.instruments.rwa, s.rwa)]);
    const liq = await this.submit("CashIssuer", `${tag}-liquidity`, [holding(p.CashIssuer, p.FundAgent, this.instruments.cash, s.fundLiquidity)]);
    const liquidity = createdId(liq.events, "Holding");
    await this.submit("FundAgent", `${tag}-facility`, [
      create(T.RedemptionFacility, {
        fundAgent: p.FundAgent,
        treasury: p.Treasury,
        productiveInstrument: this.instruments.rwa,
        cashIssuer: p.CashIssuer,
        cashInstrument: this.instruments.cash,
        liquidity,
        capacity: dec(s.capacity),
        isOpen: true,
      }),
    ]);
    await this.submit("Treasury", `${tag}-batch`, [
      create(T.PaymentBatch, {
        treasury: p.Treasury,
        financeViewer: p.FinanceViewer,
        batchRef: s.batchRef,
        period: s.period,
        lines: s.amounts.map((amount, i) => ({ payee: p[PAYEES[i]!], amount: dec(amount), lineRef: `${s.batchRef}-L${i + 1}` })),
        total: dec(sumAmounts(s.amounts)),
        paymentInstrument: this.instruments.cash,
        createdAt: new Date().toISOString(),
      }),
    ]);
    return { seeded: true, batchRef: s.batchRef };
  }

  /**
   * Demo replay on an already-seeded ledger: tops the TEST treasury back up to the
   * scenario balances (issuers mint only the difference) and opens a new batch.
   * Refuses while a batch or proposal is still open.
   */
  async startNewRun(s: Scenario = DEMO): Promise<{ batchRef: string }> {
    const p = this.parties;
    const st = await this.treasuryState();
    if (!st.policy) throw new Error("no treasury yet: create the demo treasury first");
    if (st.batch || st.proposal) throw new Error("a payroll run is already open");
    const run = st.financeReceipts + 1;
    const batchRef = `${s.batchRef}-R${run}`;
    const topUp = (target: string, current: string) => parseAmount(target) - parseAmount(current);
    const mint = (issuer: Role, instrument: string, amount: bigint, tag: string) =>
      this.submit(issuer, `${batchRef}-${tag}`, [
        { CreateCommand: { templateId: T.Holding, createArguments: { issuer: p[issuer], owner: p.Treasury, instrument, amount: formatAmount(amount) } } },
      ]);
    const cashGap = topUp(s.cash, st.cash);
    const rwaGap = topUp(s.rwa, st.productive);
    if (cashGap > 0n) await mint("CashIssuer", this.instruments.cash, cashGap, "cash");
    if (rwaGap > 0n) await mint("FundAgent", this.instruments.rwa, rwaGap, "rwa");
    await this.submit("Treasury", `${batchRef}-batch`, [
      {
        CreateCommand: {
          templateId: T.PaymentBatch,
          createArguments: {
            treasury: p.Treasury,
            financeViewer: p.FinanceViewer,
            batchRef,
            period: s.period,
            lines: s.amounts.map((amount, i) => ({ payee: p[PAYEES[i]!], amount: dec(amount), lineRef: `${batchRef}-L${i + 1}` })),
            total: dec(sumAmounts(s.amounts)),
            paymentInstrument: this.instruments.cash,
            createdAt: new Date().toISOString(),
          },
        },
      },
    ]);
    return { batchRef };
  }

  /** Treasury's own view plus the verified route preview. */
  async treasuryState(): Promise<TreasuryState> {
    const p = this.parties;
    const all = await this.as("Treasury");
    const of = (name: TemplateName) => all.filter((c) => templateNameOf(c.createdEvent.templateId) === name);
    const holdings = of("Holding").map((c) => c.createdEvent.createArgument as { issuer: string; owner: string; instrument: string; amount: string });
    const cash = sumAmounts(holdings.filter((h) => h.owner === p.Treasury && h.issuer === p.CashIssuer && h.instrument === this.instruments.cash).map((h) => h.amount));
    const productive = sumAmounts(holdings.filter((h) => h.owner === p.Treasury && h.issuer === p.FundAgent && h.instrument === this.instruments.rwa).map((h) => h.amount));
    const [policyC] = of("TreasuryPolicy");
    const [batchC] = of("PaymentBatch");
    const [proposalC] = of("ExecutionProposal");
    const [facilityC] = of("RedemptionFacility");
    const facility = facilityC
      ? {
          contractId: facilityC.createdEvent.contractId,
          isOpen: Boolean(facilityC.createdEvent.createArgument.isOpen),
          capacity: dec(String(facilityC.createdEvent.createArgument.capacity)),
        }
      : null;

    let route: RoutingResult | null = null;
    const obligationSource = batchC ?? proposalC;
    if (policyC && obligationSource) {
      const pol = policyC.createdEvent.createArgument as { minCashBuffer: string; maxRedeemPerExecution: string | null; allowedRoutes: ("CashOnly" | "CashThenRedeem")[] };
      const total = batchC
        ? String(batchC.createdEvent.createArgument.total)
        : String((proposalC!.createdEvent.createArgument.batch as { total: string }).total);
      const redeemable = facility ? (parseAmount(facility.capacity) < parseAmount(productive) ? facility.capacity : productive) : "0";
      route = computeFundingRoute({
        cash,
        productive,
        redeemable,
        obligation: dec(total),
        policy: { minCashBuffer: dec(pol.minCashBuffer), maxRedeemPerExecution: pol.maxRedeemPerExecution === null ? null : dec(pol.maxRedeemPerExecution), allowedRoutes: pol.allowedRoutes },
      });
    }

    return {
      instruments: this.instruments,
      cash,
      productive,
      total: sumAmounts([cash, productive]),
      facility,
      policy: policyC ? { contractId: policyC.createdEvent.contractId, payload: policyC.createdEvent.createArgument } : null,
      batch: batchC ? { contractId: batchC.createdEvent.contractId, payload: batchC.createdEvent.createArgument } : null,
      proposal: proposalC
        ? {
            contractId: proposalC.createdEvent.contractId,
            payload: proposalC.createdEvent.createArgument,
            approvals: proposalC.createdEvent.createArgument.approvals as string[],
            requiredApprovals: Number(proposalC.createdEvent.createArgument.requiredApprovals),
          }
        : null,
      route,
      financeReceipts: of("FinanceReceipt").length,
    };
  }

  private async holdingIds() {
    const p = this.parties;
    const hs = await this.as("Treasury", ["Holding"]);
    const pick = (issuer: string, instrument: string) =>
      hs
        .filter((c) => {
          const a = c.createdEvent.createArgument;
          return a.owner === p.Treasury && a.issuer === issuer && a.instrument === instrument;
        })
        .map((c) => c.createdEvent.contractId);
    return { cash: pick(p.CashIssuer, this.instruments.cash), productive: pick(p.FundAgent, this.instruments.rwa) };
  }

  /**
   * Proposes execution. `proposedRedeem` defaults to the router's verified amount;
   * passing any other value is the "AI overruled" stress test and the ledger rejects it.
   */
  async propose(opts: { proposedRedeem?: string; aiNote?: AiNoteInput } = {}): Promise<string> {
    const st = await this.treasuryState();
    if (!st.batch || !st.policy) throw new Error("no open payment batch");
    if (!st.route || st.route.route === null) throw new Error(`route blocked: ${st.route?.blockedReason ?? "unknown"}`);
    const ids = await this.holdingIds();
    const tx = await this.submit("Treasury", `propose-${short(st.batch.contractId)}-${opts.proposedRedeem ?? "verified"}`, [
      {
        ExerciseCommand: {
          templateId: T.PaymentBatch,
          contractId: st.batch.contractId,
          choice: "ProposeExecution",
          choiceArgument: {
            policyCid: st.policy.contractId,
            cashHoldings: ids.cash,
            productiveHoldings: ids.productive,
            facilityCid: st.facility?.contractId ?? null,
            proposedRedeem: dec(opts.proposedRedeem ?? st.route.redeemAmount),
            aiNote: opts.aiNote
              ? {
                  summary: opts.aiNote.summary,
                  recommendedRedeem: opts.aiNote.recommendedRedeem === null ? null : dec(opts.aiNote.recommendedRedeem),
                  agreesWithVerified: opts.aiNote.agreesWithVerified,
                }
              : null,
          },
        },
      },
    ]);
    return createdId(tx.events, "ExecutionProposal");
  }

  async approve(role: (typeof APPROVERS)[number] | Role): Promise<string> {
    const [proposal] = await this.as(role, ["ExecutionProposal"]);
    if (!proposal) throw new Error(`${role} cannot see an open proposal`);
    const tx = await this.submit(role, `approve-${short(proposal.createdEvent.contractId)}-${role}`, [
      {
        ExerciseCommand: {
          templateId: T.ExecutionProposal,
          contractId: proposal.createdEvent.contractId,
          choice: "Approve",
          choiceArgument: { approver: this.parties[role] },
        },
      },
    ]);
    return createdId(tx.events, "ExecutionProposal");
  }

  /**
   * Treasury executes once approvals meet the threshold. The fund agent's
   * liquidity holding is attached as an explicitly disclosed contract
   * (docs/ARCHITECTURE.md). Here the backend reads it as FundAgent because one
   * demo operator hosts all parties; in production the fund agent's own
   * service would supply the disclosure.
   */
  async execute(): Promise<{ updateId: string; financeReceipt: string }> {
    const st = await this.treasuryState();
    if (!st.proposal) throw new Error("no proposal to execute");
    const ids = await this.holdingIds();
    const disclosed = [];
    if (st.facility) {
      const [fac] = await this.as("FundAgent", ["RedemptionFacility"]);
      const liquidityId = fac?.createdEvent.createArgument.liquidity as string | undefined;
      const liq = (await this.as("FundAgent", ["Holding"], true)).find((c) => c.createdEvent.contractId === liquidityId);
      if (liq) disclosed.push(toDisclosed(liq));
    }
    const tx = await this.submit(
      "Treasury",
      `execute-${short(st.proposal.contractId)}`,
      [
        {
          ExerciseCommand: {
            templateId: T.ExecutionProposal,
            contractId: st.proposal.contractId,
            choice: "Execute",
            choiceArgument: { cashHoldings: ids.cash, productiveHoldings: ids.productive, facilityCid: st.facility?.contractId ?? null },
          },
        },
      ],
      { disclosedContracts: disclosed },
    );
    return { updateId: tx.updateId, financeReceipt: createdId(tx.events, "FinanceReceipt") };
  }

  /** Demo-only: the fund agent opens or closes its facility (S4). */
  async setFacilityOpen(open: boolean): Promise<void> {
    const [fac] = await this.as("FundAgent", ["RedemptionFacility"]);
    if (!fac) throw new Error("no facility");
    await this.submit("FundAgent", `facility-${short(fac.createdEvent.contractId)}-${open}`, [
      { ExerciseCommand: { templateId: T.RedemptionFacility, contractId: fac.createdEvent.contractId, choice: "SetOpen", choiceArgument: { open } } },
    ]);
  }

  /** Exactly what the ledger shows this one party. */
  async roleView(role: Role): Promise<ContractView[]> {
    const rows = await this.as(role);
    return rows.map((c) => ({
      template: templateNameOf(c.createdEvent.templateId) ?? "Unknown",
      contractId: c.createdEvent.contractId,
      payload: c.createdEvent.createArgument,
      signatories: c.createdEvent.signatories,
      observers: c.createdEvent.observers ?? [],
    }));
  }
}

function createdId(events: { CreatedEvent?: { contractId: string; templateId: string } }[], name: TemplateName): string {
  const ids = events.flatMap((e) => (e.CreatedEvent && templateNameOf(e.CreatedEvent.templateId) === name ? [e.CreatedEvent.contractId] : []));
  const last = ids.at(-1);
  if (!last) throw new Error(`transaction created no ${name}`);
  return last;
}

const short = (cid: string) => cid.slice(0, 24);

export { LedgerError };
