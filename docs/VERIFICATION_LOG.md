# Verification Log

Each entry records a fact we rely on and where it came from. "Third-party" sources are hints, not authority, until confirmed against official docs or a successful call.

---

Fact: dpm is the Daml CLI (`dpm build`, `dpm test`, `dpm sandbox`, `dpm init`). It requires JDK 17+. The default SDK in generated `daml.yaml` is 3.5.7. Linux install: `curl https://get.digitalasset.com/install/install.sh | sh`.
Source: Official Canton docs
URL/file: https://docs.canton.network/sdks-tools/cli-tools/dpm
Network/version: SDK 3.5.7
Date verified: 2026-10-06
Evidence: Docs page fetched. Not yet installed or run.

---

Fact: CN Quickstart LocalNet recommends at least 8 GB of memory for Docker.
Source: Official repo README
URL/file: https://github.com/digital-asset/cn-quickstart
Network/version: main, fetched 2026-10-06
Date verified: 2026-10-06
Evidence: README text: "The recommended minimum total memory is 8 GB."

---

Fact: canton-devkit (listed in the HackCanton starter pack) needs about 8 GB of free RAM for Docker and about 20 GB of disk. It includes CIP-0056 / Token Standard V2 demo token flows.
Source: Tool repo README (HackCanton materials)
URL/file: https://github.com/bitdynamics-ab/canton-devkit
Network/version: main, fetched 2026-10-06
Date verified: 2026-10-06
Evidence: README. Not yet run.

---

Fact: HackCanton shared DevNet login uses the same email and password as the HackCanton platform. The endpoints are those listed in CLAUDE.md §9.
Source: HackCanton Season 3 "Materials" page (pasted by Maris)
URL/file: HackCanton platform materials
Network/version: hackcanton-01 DevNet
Date verified: 2026-10-06
Evidence: Text pasted in session. The NODERS detailed quickstart URL is not yet retrieved.

---

Fact (THIRD-PARTY, UNCONFIRMED): DevNet tokens come from a password grant against NODERS Keycloak with client_id `web-app-ui-hackcanton-01-devnet` and scopes `openid daml_ledger_api offline_access`. Parties are created in the Console UI, and the DAR is uploaded in the Console "Collections" tab.
Source: Another HackCanton S3 team's docs
URL/file: https://github.com/no-witness-labs/veil-lite-hackathon/blob/main/docs/DEVNET.md
Network/version: hackcanton-01
Date verified: 2026-10-06
Evidence: Docs fetched. Must be confirmed by our own login or the NODERS quickstart.

---

Fact: BitSafe Decentralization Manager is open source and documents `GovernableAction` for custom governed proposals (CUSTOM_DAML_TEMPLATES.md). A draft hackathon LocalNet bundle (PR #440) runs LocalNet plus 3 DecMan nodes, demonstrating propose → 2 confirms → execute. It was verified on a 29 GB / 14 CPU host.
Source: BitSafe / DLC-link GitHub
URL/file: https://github.com/DLC-link/decentralization-manager , PR #440
Network/version: release v1.13.0; PR #440 draft as of 2026-10-05
Date verified: 2026-10-06
Evidence: Repo and PR pages fetched. Source not yet cloned or inspected.

---

Fact: Grofty is a non-custodial browser-extension wallet for Canton (Party ID, CC, USDCx, CIP-0103 dApp connection). dApps connect through CIP-0103, using PartyLayer or `@canton-network/dapp-sdk`.
Source: HackCanton materials; grofty.cc; PartyLayer GitHub
URL/file: https://grofty.cc/ , https://github.com/PartyLayer/PartyLayer
Network/version: MainNet
Date verified: 2026-10-06
Evidence: Pages read. No connection attempted (MainNet requires approval).

---

Fact: Build host VPS (SSH alias `optiongenome`; IP intentionally not recorded) runs Ubuntu 24.04 with 2 CPUs and 7.8 GB RAM (about 4.3 GB available), shared with other projects. Lute tooling is isolated under the `lute` user: Temurin JDK 21.0.12 and dpm with SDK 3.5.12 (canton-open-source 3.5.19, damlc 3.5.3, daml-script 3.5.3).
Source: Commands run on the host (`free -h`, `nproc`, `java -version`, `dpm version`)
URL/file: scripts/vps/daml.ps1
Network/version: local build host
Date verified: 2026-10-06
Evidence: Command output in session.

---

Fact: Daml 3 rejects a submission that fetches or exercises a contract not visible to the submitting parties ("Attempt to fetch or exercise a contract not visible to the reading parties").
Source: Our own `dpm test` run (SDK 3.5.12)
URL/file: daml/lute-tests
Network/version: Daml Script IDE ledger, SDK 3.5.12
Date verified: 2026-10-06
Evidence: Test failure output before the design change (Execute submitted by Treasury; fund liquidity disclosed).

---

Fact: Daml Script 3.5.3 exposes `queryDisclosure : p -> ContractId t -> Script (Optional Disclosure)`, `discloseMany`, `actAs`, and `trySubmit` returning `Either SubmitError a`. `Show SubmitError` includes the failure message.
Source: daml-script source inside the installed SDK
URL/file: ~/.dpm/cache/components/daml-script/3.5.3/daml-script-2.1.dar (Daml/Script.daml, Internal/Questions/Submit.daml, Submit/Error.daml)
Network/version: SDK 3.5.12
Date verified: 2026-10-06
Evidence: Source inspected; used in passing tests.

---

Fact: Grofty dApp integration (from `@groftylabs/dapp-sdk` 0.2.0 source and README; requires Grofty Wallet ≥ 2.0.4):
- The provider is injected at `window.cantonWallet` and also announced via `canton:announceProvider` / `canton:requestProvider`.
- Grofty is **MainNet only**: it reports `canton:da-mainnet` and has no network switching.
- Methods: `connect`, `status`, `getActiveNetwork`, `listAccounts`, `getPrimaryAccount`, `signMessage`, `prepareExecute` (plus the SDK's `prepareExecuteAndWait`), and `ledgerApi`.
- `prepareExecute` accepts either a simple transfer `{ receiver, amount, tokenSymbol?, memo? }` (defaults to CC) or generic Daml `commands` with `disclosedContracts`, `commandId`, `readAs`, `synchronizerId` and `packageIdSelectionPreference`.
- It submits as a **single party**: `actAs` is refused, and `readAs` may name only the wallet's own party.
- `ledgerApi` is a narrow, read-only, party-scoped reader: `balance`, `wallets`, `/v2/state/ledger-end`, `/v2/state/active-contracts`, `/v2/updates/update-by-id`, `/v2/events/events-by-contract-id`.
- It never exposes a ledger endpoint or token to the page.
- Errors: 4001 user rejected, 4100 unauthorized, -32601 not found, -32602 invalid params, -32603 internal or approval timeout.
Source: Grofty official GitHub (groftywallet/grofty-dapp-sdk)
URL/file: https://github.com/groftywallet/grofty-dapp-sdk (commit 6d52084, 2026-08-27): README.md, src/types.ts, src/discovery.ts
Network/version: MainNet; SDK 0.2.0
Date verified: 2026-10-06
Evidence: Source read. No connection attempted yet.

---

Fact (OPEN): Generic Daml commands for a custom template (Lute) through Grofty need `lute-core` vetted on Grofty's hosting participant. The SDK does not document any way to vet a third-party DAR. Until proven otherwise, MNET-4/5 (Lute custom contracts on MainNet) are BLOCKED, and the honest MainNet path is spec §30: a real tiny CC/USDCx transfer via Grofty (MNET-3) linked to a Lute batch/line by memo.
Source: Inference from the SDK docs above; to be confirmed with Grofty (Telegram t.me/Grofty_Community)
URL/file: —
Network/version: MainNet
Date verified: 2026-10-06
Evidence: None yet. Listed in OPEN_QUESTIONS #9.
