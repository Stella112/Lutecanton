# Integration Status

Statuses: READY · BLOCKED · DISABLED · MISCONFIGURED · UNVERIFIED

| Integration | Needed capability | Verified source | Network | Status | Blocker | Evidence |
|---|---|---|---|---|---|---|
| Daml SDK (dpm) | build/test Lute DAR | docs.canton.network dpm page + install | VPS build host | READY | — | dpm build + 17/17 dpm test |
| NODERS DevNet | DAR deploy, parties, party-scoped reads | official NODERS guide + live use | DevNet (hackcanton-devnet-3, Canton 3.6.1) | READY | — | PROOF #4–6 |
| Canton Ledger API (JSON) | commands, ACS reads per party | OpenAPI + live calls | local sandbox 3.5.19, DevNet 3.6.1 | READY | — | e2e tests; PROOF #5 |
| CIP-56 token standard | real asset holdings / transfers | canton-devkit README (hint) | local/DevNet | UNVERIFIED | interfaces not inspected | — |
| CIP-0103 | wallet connection | HackCanton materials | MainNet | DISABLED | M10, requires approval | — |
| BitSafe DM | 2-of-3 GovernableAction | DLC-link repo, PR #440 | LocalNet | UNVERIFIED | multi-node needs a large host (OQ 1, 7) | — |
| Grofty | MainNet party, balance, CC/USDCx transfer (CIP-0103) | groftywallet/grofty-dapp-sdk source | MainNet only | UNVERIFIED | no live connection yet; custom DAR vetting unknown | VERIFICATION_LOG |
| OneSwap | RWA route, if a pair exists | — | — | DISABLED | not evaluated | — |
| Productive RWA | redeemable productive asset | own Daml test assets | LocalNet mock cMMF-L; DevNet test LUTE-RWA-DEV | READY (test assets only) | no real RWA access | PROOF #5 |
| Qwen | explanation only | Model Studio docs | — | DISABLED | no key provided; deterministic fallback in use | @lute/ai tests |
| Deterministic router | authoritative funding route | own code | n/a | READY | — | 29 passing tests |
