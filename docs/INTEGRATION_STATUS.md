# Integration Status

Statuses: READY · BLOCKED · DISABLED · MISCONFIGURED · UNVERIFIED

| Integration | Needed capability | Verified source | Network | Status | Blocker | Evidence |
|---|---|---|---|---|---|---|
| Daml SDK (dpm) | build/test Lute DAR | docs.canton.network dpm page + install | VPS build host | READY | — | dpm build + 17/17 dpm test |
| NODERS DevNet | DAR deploy, parties, party-scoped reads | HackCanton materials | DevNet | UNVERIFIED | login and DAR upload path unconfirmed (OQ 2–5) | — |
| Canton Ledger API (JSON) | commands, ACS reads per party | docs.canton.network ledger-api | local/DevNet | UNVERIFIED | needs running ledger | — |
| CIP-56 token standard | real asset holdings / transfers | canton-devkit README (hint) | local/DevNet | UNVERIFIED | interfaces not inspected | — |
| CIP-0103 | wallet connection | HackCanton materials | MainNet | DISABLED | M10, requires approval | — |
| BitSafe DM | 2-of-3 GovernableAction | DLC-link repo, PR #440 | LocalNet | UNVERIFIED | multi-node needs a large host (OQ 1, 7) | — |
| Grofty | MainNet party, balance, CC/USDCx transfer (CIP-0103) | groftywallet/grofty-dapp-sdk source | MainNet only | UNVERIFIED | no live connection yet; custom DAR vetting unknown | VERIFICATION_LOG |
| OneSwap | RWA route, if a pair exists | — | — | DISABLED | not evaluated | — |
| Productive RWA | redeemable productive asset | own Daml (MOCK cMMF-L) | Daml Script | READY (mock only) | no real RWA access | S1, S4a, S4b tests |
| Qwen | explanation only | — | — | DISABLED | provider not chosen (OQ 8); deterministic fallback planned | — |
| Deterministic router | authoritative funding route | own code | n/a | READY | — | 29 passing tests |
