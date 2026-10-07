# Lute

## AI-assisted private treasury execution on Canton

> Keep capital productive. Route intelligently. Approve collectively. Settle privately.

**Lute keeps treasury capital productive until the moment it has to pay, and only the right people see it move.**

A company holds 20,000 liquid and 15,000 in a productive RWA, and needs to pay 24,800. Lute redeems **only the 4,800 shortfall** (10,200 stays invested), requires **2-of-3** treasury approvals, then pays everyone in **one atomic Canton transaction**. Finance, each employee and the auditor each get **different authorized receipts** of the same event.

Payroll is the demo use case. The product category is **private treasury execution**. Built for HackCanton Season 3 (Investment Infrastructure: Funds, DAOs & Governance Tools).

## What is verified

This README never claims more than [docs/CLAIMS.md](docs/CLAIMS.md). Evidence is in [docs/PROOF.md](docs/PROOF.md).

| Capability | Status |
|---|---|
| Lute Daml contracts deployed on **HackCanton DevNet**; full workflow (exact-shortfall route → 2-of-3 approval → atomic redemption + 5 payments + receipts) | **DevNet verified** |
| Per-party privacy on DevNet: Alice sees only her payment, Auditor only aggregates, Outsider nothing | **DevNet verified** |
| AI-proposed redemption of 8,000 rejected by on-ledger policy; atomic rollback when redemption fails | Tested (Daml Script + live local Canton ledger) |
| Grofty wallet connection on **Canton MainNet** (read-only: network and party) | Partially verified |
| BitSafe decentralized governance, real USYC/USDCx, Lute contracts on MainNet | **Not done** (roadmap) |

**Assets are test assets:** `LUTE-USD-DEV` / `LUTE-RWA-DEV` on DevNet and `cUSD-L` / `cMMF-L` locally, all labelled in the UI. They are not USDCx or USYC.

## How it works

```
Obligation (PaymentBatch, visible to Treasury + Finance only)
  ↓  deterministic router: cash first, redeem exact shortfall
  ↓  AI explanation from aggregates only (advisory, no authority)
ProposeExecution (Daml recomputes the route from holdings; any other amount is rejected)
  ↓  Approve × 2 of 3 operators (each approver signs the proposal)
Execute (one transaction): redeem shortfall → pay every line → receipts
  ↓
PayeeReceipt (payee only) · FinanceReceipt (finance) · AuditReceipt (auditor, aggregates)
```

- **AI recommends, policy governs, people approve.** Authoritative numbers come from a pure, decimal-safe router, and Daml re-verifies them. The AI never sees names or salaries.
- **Privacy is Canton's, not the UI's.** Each role view is an active-contract query for exactly that party; the participant decides what it may see.
- **Atomicity.** If the redemption fails, nobody is paid and no receipt exists (tested).

Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Business case: [docs/BRIEF.md](docs/BRIEF.md). Demo: [docs/DEMO.md](docs/DEMO.md).

## Why Canton

Payroll, treasury positions, funding shortfalls and approval structures are confidential. Lute needs shared state without universal visibility, which Canton's sub-transaction privacy provides at the ledger level.

## Repository

```
daml/lute-core       policy, batch, governance, atomic execution, receipts, test assets
daml/lute-tests      17 Daml Script tests (scenarios + 21 generated routing-parity cases)
packages/routing     deterministic router (TypeScript, bigint fixed-point = Daml Numeric 10)
packages/canton      JSON Ledger API v2 client (+ DevNet password-grant tokens)
packages/domain      Lute workflow over the ledger: seed, propose, approve, execute, role views
packages/ai          Qwen explanation: aggregate-only input, Zod-validated output, fallback
apps/web             Next.js app: dashboard, review, governance, settlement, privacy, MainNet·Grofty
scripts/             DevNet check, local sandbox + tunnel, Daml test generator
docs/                claims, proof, architecture, DevNet runbook, demo script, brief
```

## Run it

Requirements: Node ≥ 24, pnpm 10. For Daml builds: JDK 17+ and dpm (SDK 3.5.12).

```bash
pnpm install
pnpm --filter @lute/routing test
pnpm --filter @lute/ai test
```

**On HackCanton DevNet** ([docs/DEVNET.md](docs/DEVNET.md)):
1. Upload `lute-core-0.1.0.dar` and create the 14 role parties in the NODERS Console.
2. Copy `.env.example` to `.env` and fill in the DevNet values, your ledger user id, party prefix and platform login.
3. Run `node scripts/devnet/check.mjs`. It should report 14/14 parties.
4. Run `pnpm --filter @lute/web dev`, open http://localhost:3000, then click **Create demo treasury**.

**On a local Canton sandbox:** see [scripts/localnet/README.md](scripts/localnet/README.md).

**Daml tests:**
```bash
cd daml && dpm build --all && cd lute-tests && dpm test
```

## Known limitations

- **Native Daml 2-of-3 governs the Lute workflow, not custody.** A single-key Treasury party could still move holdings outside Lute. BitSafe's decentralized party is the planned fix.
- **Approvers and Finance see individual lines**, because they are stakeholders of the proposal.
- **One team user on DevNet.** Our DevNet team has a single ledger user with rights to all its parties. Views are scoped per party at the ledger, but one token could read every team party.
- **Demo role switcher, not authentication.**
- **No multi-node failure test (S7).** The available hosts are too small for the BitSafe multi-node bundle.
