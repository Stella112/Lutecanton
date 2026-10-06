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
| Same, on a running Canton ledger | PLANNED | M5 (sandbox) |
| Lute DAR on HackCanton DevNet | PLANNED | M8 |
| BitSafe governance | PLANNED | M6; multi-node BLOCKED by hardware |
| Node-failure tolerance (S7) | BLOCKED | needs a ≥ 16–32 GB host |
| Qwen explanation | PLANNED | M4 |
| Grofty / MainNet (MNET-1…6) | PLANNED | requires Maris approval |
| Real USYC / real RWA redemption | PLANNED | no verified access; mocks only |
