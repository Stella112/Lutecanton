# Claims

README must never claim more than this table.

Statuses: PLANNED · IMPLEMENTED · TESTED · LOCALNET VERIFIED · DEVNET VERIFIED · MAINNET VERIFIED · BLOCKED

| Claim | Status | Evidence |
|---|---|---|
| Deterministic cash-first / exact-shortfall routing | TESTED | `@lute/routing` 29/29; Daml parity 21 cases |
| Backend and Daml routing agree | TESTED | `testRoutingParity` (generated from shared fixture) |
| Daml recomputes the route; mismatched proposals rejected (AI overruled) | TESTED | `testS5AiOverruled` |
| 2-of-3 native governance; unauthorized and duplicate approvals rejected | TESTED | `testS2…`, `testS3…`, `testDuplicateApproval` |
| Atomic redeem + pay + receipts; rollback on redemption failure | TESTED | `testS4RedemptionClosedRollsBack`, `testS4RedemptionMidwayFailureRollsBack` |
| Role-specific receipts; payee, auditor, fund agent and outsider isolation | TESTED (Daml Script, per-party queries) | `testS6Privacy` |
| Full workflow on a running Canton ledger (JSON Ledger API): exact-shortfall route, 2-of-3, atomic execution, per-party views, AI 8,000 rejected, rollback on closed facility | TESTED (local single-participant sandbox, Canton 3.5.19) | `packages/domain` e2e 3/3; UI walkthrough 2026-10-06 |
| Lute DAR on HackCanton DevNet | PLANNED | M8 |
| BitSafe governance | PLANNED | M6; multi-node BLOCKED by hardware |
| Node-failure tolerance (S7) | BLOCKED | needs a ≥ 16–32 GB host |
| AI explanation: aggregate-only input, Zod-validated output, deterministic fallback, disagreement recorded | TESTED (fallback live; Qwen path with mocked HTTP, no key yet) | `@lute/ai` 8/8 |
| Grofty connect + Party ID + balance (MNET-1, MNET-2) | IMPLEMENTED (not yet verified with a live wallet) | `apps/web` /mainnet; needs Maris to connect in Chrome |
| Real tiny CC/USDCx transfer via Grofty (MNET-3) | PLANNED | needs explicit approval of asset, amount and receiver |
| Lute DAR vetted and executing on MainNet (MNET-4/5) | BLOCKED | no documented vetting path on Grofty's participant (OQ 9) |
| Treasury UI (dashboard, review, governance, settlement, privacy) reading actual ledger state | IMPLEMENTED (verified against the local sandbox) | `apps/web` |
| Real USYC / real RWA redemption | PLANNED | no verified access; mocks only |
