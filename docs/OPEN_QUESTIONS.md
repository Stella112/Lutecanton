# Open Questions

| # | Question | Blocks | Owner | Status |
|---|---|---|---|---|
| 1 | Build host | M1 | Maris | RESOLVED: VPS optiongenome, isolated `lute` user. Too small for LocalNet (S7 blocked) |
| 2 | Console access: Wallet onboarding works, but Console SSO returns `sso_signup_not_allowed` ("not registered, ask an administrator for an invite"). Needs a NODERS invite. | M8 (DAR upload, parties) | Maris → NODERS (@mrlp8, @savetheales, @ram_noders) | BLOCKED |
| 3 | DAR upload | M8 | NODERS guide | RESOLVED: self-service via Console → Collections → Upload DAR |
| 4 | NODERS quickstart URL | M8 | — | RESOLVED: docs/DEVNET.md |
| 5 | Party-scoped reads | §37 | NODERS guide | RESOLVED with caveat: one team user, reads scoped by `filtersByParty` (ledger-side projection). See docs/DEVNET.md |
| 6 | Which CIP-56 assets exist on hackcanton-01 DevNet (besides CC)? | M9 | Claude (after login) | OPEN |
| 7 | What are the current BitSafe challenge requirements (decentralized party? node-failure test?) on the HackCanton S3 challenge page? | M6 scope | Maris (link) / Claude | OPEN |
| 8 | Qwen provider, base URL and model to use? | M4 (fallback works without it) | Maris | OPEN |
| 9 | Grofty accepts generic Daml commands (verified in SDK). Can a third-party DAR (lute-core) be vetted on Grofty's hosting participant? | MNET-4/5 | Maris → Grofty TG | OPEN |
| 10 | MNET-3 test: which asset (CC or USDCx), what tiny amount, and which receiver party (a second wallet Maris controls)? Needs explicit approval. | MNET-3 | Maris | OPEN |
