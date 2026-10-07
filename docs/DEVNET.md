# HackCanton DevNet (NODERS hackcanton-01)

Source: official NODERS guide, https://hackmd.io/@IzUWaelHTRa_fG1NRW376w/HkBpCR5YGx (shared by the HackCanton organisers). The node is shared by all teams, so never put real sensitive data on it.

## Identity model (from the guide)

- One AppFactory account (https://hackathon.appsfactory.cc/login) is your identity for the Console, Ledger API and Wallet.
- The ledger user is created automatically. Its id is the Keycloak `sub` claim.
- Parties get a team namespace prefix (`<prefix>-alice::1220…`). Quota: **20 parties**.
- Every party the team creates in the Console automatically grants the team's ledger user `CanActAs` + `CanReadAs`.

## Steps for Maris (UI only)

1. **Wallet onboarding.** Open https://wallet.validator.hackcanton-01.devnet.naas.noders.services, log in with the hackathon credentials, click **Onboard yourself**, and wait 5–10 s.
2. **Console.** Open https://console.participant.hackcanton-01.devnet.naas.noders.services/ and click **Sign in with Authfactory** (SSO), not a username/password form.
3. **Upload the DAR.** Go to **Collections** → **Upload DAR** (top right), select the HackCanton participant and `dist/lute-core-0.1.0.dar`.
   - Package id: `ad8c0d8d1debe8b2208eb24f7ee13ed5d2ca931739fd0c008d2ab728f4b69676`
   - DAR file sha256: `d2715d48a1427f741ac97810f23b1e15508c2a9d5106dd8b59edeaaff5de734a`
   - A re-upload with changes needs a version bump in `daml/lute-core/daml.yaml`.
4. **Create the parties.** Go to **Participants** → HackCanton node → **Parties** → **Create Party** for each of these 14:
   `Treasury FinanceOp TreasuryOp RiskOp FinanceViewer Alice Ben Chidi David Eva Auditor FundAgent CashIssuer Outsider`
5. Copy the **Ledger user ID** and **party namespace prefix** from the Console identity card into chat (they are not secrets).

## Credentials (local `.env` only, never committed)

```
CANTON_NETWORK=devnet
CANTON_JSON_LEDGER_API_URL=https://ledger-api-json.participant.hackcanton-01.devnet.naas.noders.services
CANTON_OIDC_TOKEN_URL=https://keycloak.naas.noders.services/realms/noders-appsfactory/protocol/openid-connect/token
CANTON_OIDC_AUDIENCE=https://hackcanton-01.devnet.naas.noders.services
CANTON_CLIENT_ID=web-app-ui-hackcanton-01-devnet
CANTON_USERNAME=<platform email>
CANTON_PASSWORD=<platform password>
```

Token: `grant_type=password`, scope `openid daml_ledger_api offline_access`, expires after 3 h. Refresh it with `grant_type=refresh_token`, before 60 s remain, and always store the new refresh token.

## How Lute's party-scoped reads work here

One ledger user holds read rights for all team parties. Each role view queries `/v2/state/active-contracts` with `filtersByParty` containing **only that role's party**. The participant then returns exactly the contracts that party is a stakeholder of: the ledger computes the projection, not our JavaScript. This differs from separate users per role, because one team token *could* read every team party. On this shared node we cannot create additional ledger users (user management is hidden for tenants). The demo states this honestly.

## Errors

Errors include a trace id (`tid …`). Search it in Grafana (https://grafana.participant.hackcanton-01.devnet.naas.noders.services/). NODERS support on Telegram: @mrlp8, @savetheales, @ram_noders. Send them the ledger user id, party/package ids, the tid and the timestamp, never a token.

## Node facts (from the Console, 2026-10-07)

- Team participant: `hackcanton-devnet-3`, Ledger API version 3.6.1, endpoints as above.
- Lute parties are created as `<namespace prefix><Role>`; the app finds them via `LUTE_PARTY_PREFIX`.
- On DevNet the app uses the test instruments `LUTE-USD-DEV` and `LUTE-RWA-DEV` (DEVNET TEST), never the `-L` LocalNet mocks.

## Open risk

The node's supported Daml-LF version is not yet confirmed against our SDK 3.5.12 build. Check with `GET /v2/version` once a token is available, or the DAR upload will reject it.
