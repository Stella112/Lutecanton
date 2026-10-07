# Proof

Successful network operations only. No secrets. Partial results are labelled.

| # | Network | Timestamp | Role / party | Operation | Result | Evidence |
|---|---|---|---|---|---|---|
| 1 | Canton MainNet | 2026-10-06 10:59 (Maris local time) | Maris (Grofty) | CIP-0103 `connect` + `status` from `localhost:3000/mainnet` | **PARTIAL**: site connected, wallet reports `canton:da-mainnet`. No wallet was selected in the extension, so no Party ID was returned and `getBalance` failed with -32603 "No active wallet selected". | Screenshot shared by Maris in session |
| 2 | HackCanton DevNet | 2026-10-06 11:30 (Maris local time) | Maris (platform account) | Wallet "Onboard yourself" | Onboarded; Canton Coin wallet shows 0 CC | Screenshot shared by Maris in session |
| 3 | HackCanton DevNet | 2026-10-07 18:09 (Maris local time) | Maris (Console) | Created 14 Lute role parties under the team namespace (e.g. `<prefix>Treasury`, `<prefix>Outsider`) on participant hackcanton-devnet-3 (Ledger API 3.6.1) | Console reported "Party created … allocated successfully"; "14 of 20 parties used" | Screenshots shared by Maris in session |
