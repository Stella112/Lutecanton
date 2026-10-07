# Lute: business brief

**Track:** Investment Infrastructure: Funds, DAOs & Governance Tools (Governed Treasury)

## Problem

Treasuries that hold tokenized money-market funds or T-bill RWAs face a timing problem every time an obligation (payroll, suppliers, distributions) comes due:

- **Idle cash drag:** to be safe, finance teams redeem productive assets days early, or keep large cash buffers, losing yield.
- **Over-redemption:** redemptions are sized by hand ("sell 15k to be safe") instead of to the exact shortfall.
- **Leaky execution on public rails:** payroll, treasury positions, funding shortfalls and approval structures become visible to anyone watching the chain.
- **Unenforced governance:** "2 of 3 approvals" lives in a spreadsheet or a wallet setting, disconnected from the actual funding decision.

## Solution

Lute is a private treasury execution layer on Canton:

1. A **deterministic engine** computes cash-first funding and the *exact* RWA shortfall.
2. **AI** (Qwen, optional) explains the route from aggregate numbers only. It has no authority.
3. **Daml policy** recomputes the route from on-ledger holdings and rejects anything else.
4. **2-of-3 operators** must approve before execution.
5. **One atomic transaction** redeems the shortfall, pays every line and issues role-specific receipts.
6. **Canton privacy**: finance, each employee, the auditor and the fund see different, authorized views.

## Why Canton

The workflow is inherently confidential: salaries, positions, shortfalls, counterparties. Lute needs **shared state without universal visibility**. Canton enforces this per party at the ledger level, and Lute's privacy screen reads each view directly from the participant as that party.

## Ideal customer profile

- **Primary:** crypto-native companies, DAOs and funds that already hold tokenized cash equivalents on Canton and pay contributors or suppliers in stablecoins (e.g. 20–500 payees, $50k–$5M monthly obligations).
- **Secondary:** fund administrators and treasury-management providers offering "productive treasury" services to such clients. In the Lute model they act as the independent operators.
- **Pain owner:** the finance lead or CFO, who is measured on idle-cash drag and on control failures.

## Metrics and validation

What the MVP demonstrates (see `docs/PROOF.md`, `docs/CLAIMS.md`):

| Metric | Demo value |
|---|---|
| Capital kept productive vs. full liquidation | 10,200 of 15,000 (68%) stays invested |
| Redemption precision | exact shortfall (4,800), enforced on-ledger |
| Unauthorized execution attempts blocked | 1-of-3 approval, outsider approval, AI-proposed 8,000: all rejected by Daml |
| Privacy leakage to non-entitled parties | 0 contracts visible to Outsider; payee sees only own line |
| Atomicity | redemption failure → no payee paid, no receipt (tested) |

**Validation to do next:** interviews with 5–10 DAO and crypto-company finance leads on how far ahead they liquidate for payroll, and what yield they forgo. Success criteria for a pilot: ≥ 1 real payroll cycle run with exact-shortfall funding and zero manual reconciliation.

## Go-to-market

- **Wedge:** monthly contributor payroll for Canton-native teams and DAOs, the clearest, most repeated obligation.
- **Distribution:**
  - Canton ecosystem wallets and dApp connectivity (CIP-0103, Grofty);
  - treasury providers who operate as approvers;
  - tokenized-fund issuers who want their RWA to stay held until the moment of need.
- **Positioning:** "Keep capital productive. Route intelligently. Approve collectively. Settle privately." Not a payroll app or a wallet: the execution layer under them.
- **Business model hypothesis:** basis-point fee on executed volume, plus per-seat governance for operators; fund issuers may co-pay to keep AUM invested.

## MVP status (honest)

- **Lute Daml contracts:** deployed and the full workflow verified on HackCanton DevNet. Also tested locally (17 Daml Script tests, live-ledger e2e).
- **Assets:** DevNet/LocalNet **test assets**, clearly labelled. No real USYC/USDCx redemption.
- **Governance:** native Daml 2-of-3. The BitSafe decentralized-party integration is roadmap (it needs a multi-node host).
- **MainNet:** the Grofty wallet connection (read-only) only; Lute's custom contracts are not on MainNet.

## Roadmap

1. BitSafe Decentralization Manager governance (custody-level 2-of-3).
2. CIP-56 token-standard assets and real tokenized-fund redemption integrations.
3. Supplier payments and recurring obligations; policy changes under the same governance.
4. A MainNet pilot with a Canton-native team.
