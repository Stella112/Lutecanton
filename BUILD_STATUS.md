# Build Status

_Last updated: 2026-10-06_

## Current milestone

M1 (core Daml) and M2 (privacy and authorization) pass under Daml Script (in-process ledger). M3 router is done. Next: M4 (Qwen) and the backend, then `dpm sandbox` (M5).

## Completed

- Repo skeleton (pnpm workspace, `.gitignore`, `.env.example`).
- `packages/routing`: deterministic router (bigint fixed-point at Daml `Numeric 10` scale) and an AI-proposal check.
- `daml/lute-core` (DAR `lute-core-0.1.0`):
  - `Lute.Routing`: on-ledger mirror of the router.
  - `Lute.Policy`: `TreasuryPolicy`.
  - `Lute.Workflow`: `PaymentBatch` → `ProposeExecution` (recomputes the route; rejects any proposed redemption ≠ verified) → `ExecutionProposal` (native 2-of-3 `Approve` / `Reject`) → `Execute` (recompute, redeem the exact shortfall, pay every line, create receipts in **one transaction**).
  - `Lute.Receipts`: `PayeeReceipt`, `FinanceReceipt`, `AuditReceipt`.
  - `Lute.TestAsset`: MOCK `Holding` and `RedemptionFacility` for cUSD-L / cMMF-L (spec §16 Fallback B).
- `daml/lute-tests`: 17 Daml Script tests, including 21 routing parity cases generated from the shared fixture (`scripts/gen-daml-routing-cases.mjs`).
- Build host: VPS `optiongenome`, isolated user `lute`, Temurin JDK 21.0.12 and dpm (SDK 3.5.12) in that user's home, JVM capped at 1 GB. No system packages, no services. Driver: `scripts/vps/daml.ps1`.

## Verified (commands actually run)

- `pnpm --filter @lute/routing test` → 29/29 pass.
- `dpm build --all` → `lute-core-0.1.0.dar`, `lute-tests-0.1.0.dar`.
- `dpm test` (lute-tests) → 17/17 pass:
  - S1 happy path (20,000 cash + 4,800 redeemed, 10,200 remains, 5 payees paid, receipts)
  - S2 threshold (1 approval blocked, 2 executes)
  - S3 unauthorized approvals (Outsider, FinanceViewer, treasury impersonating an operator)
  - duplicate approval
  - S4a facility closed → full rollback
  - S4b failure *inside* the redemption after productive units were burned → full rollback
  - S5 AI proposal of 8,000 rejected by policy
  - S6 privacy (Alice/Ben isolation, Alice can't fetch Ben's receipt, Auditor aggregate only, FundAgent isolated, Outsider sees nothing)
  - S8 insufficient treasury
  - redemption cap, cash buffer, cash-only route, funding changed after approval, small-batch single approval, reject returns batch, routing parity, negative input
- Key failure tests assert the **rejection reason**, not just failure (this caught one test that had been failing for the wrong reason).

## Design facts discovered (see docs/ARCHITECTURE.md)

- Daml 3 requires the submitter to see every input contract. So `Execute` is submitted by **Treasury**, gated by approver signatures on the proposal. Approvers cannot execute directly.
- Redemption pays from the fund agent's private liquidity, which is supplied to the treasury's submission as an **explicitly disclosed contract** (`queryDisclosure` / `discloseMany`).

## Blocked

- Full LocalNet / canton-devkit / BitSafe multi-node: the VPS has 7.8 GB total RAM, about 4.3 GB available, 2 CPUs and is shared. All of these need ≥ 8 GB for Docker (BitSafe bundle tested on 29 GB). S7 node-failure is BLOCKED on this hardware.
- HackCanton DevNet: Console login and DAR upload path not yet confirmed (docs/OPEN_QUESTIONS.md).

## Mocks currently active

- `cUSD-L` (MOCK LOCALNET PAYMENT ASSET), `cMMF-L` (MOCK LOCALNET PRODUCTIVE RWA), `RedemptionFacility` (MOCK, stable 1.00 NAV, yield via `AccrueYield`).
- Native Daml governance (not BitSafe).

## Tests passing

- `@lute/routing`: 29/29
- `lute-tests` (Daml Script): 17/17

## Known failures

None.

## Known limitations (documented, not bugs)

- Native governance binds the Lute workflow only. A single-key `Treasury` party could still move its holdings outside Lute; custody-level 2-of-3 needs the BitSafe decentralized party (M6).
- Approvers and FinanceViewer are stakeholders of the proposal, so they witness individual lines at execution. Payees, Auditor, FundAgent and Outsider do not.
- CashIssuer (registry) sees transfers of its asset, as any issuer/registry would.
- Daml Script tests check active-contract visibility per party; transaction-tree witnessing is to be re-checked on a running sandbox (M5).

## Next action

1. M4: AI layer (`packages/ai`): sanitized aggregate input, Zod-validated output, deterministic fallback.
2. Backend (`apps/api`): party-scoped reads via the JSON Ledger API against `dpm sandbox` on the VPS (on demand, memory-capped).
3. M5: run the full workflow on the sandbox and record the evidence.
