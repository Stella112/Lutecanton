# Lute: 3-minute demo script

Network: HackCanton DevNet (hackcanton-devnet-3). Assets are clearly labelled **DEVNET TEST** (`LUTE-USD-DEV`, `LUTE-RWA-DEV`).

## Before recording

1. Run `pnpm --filter @lute/web dev` (root `.env` has `CANTON_NETWORK=devnet`).
2. Open http://localhost:3000. If the previous payroll is already settled, click **Start new payroll run**.
3. Check the dashboard shows **20,000 / 15,000 / 24,800**. Use a 1440-wide browser window and close the dev-tools "Issue" badge.

## Script

| Time | Screen | Say | Do |
|---|---|---|---|
| 0:00 | Dashboard | "A company holds 20,000 liquid and 15,000 in a productive, yield-bearing RWA. Payroll of 24,800 is due. Most treasuries would sell the RWA days early. Lute keeps capital productive until the moment it has to pay." | Point at the three balances and the obligation. |
| 0:25 | Dashboard → AI panel | "Lute's deterministic engine computes the exact shortfall: 4,800. Use all cash, redeem only 4,800, keep 10,200 invested. The AI explains it, but it only saw totals: no names, no salaries." | Point at *Liquidity shortfall 4,800* and *10,200 remains productive*. Click **Review route**. |
| 0:45 | Review | "AI recommends, policy governs. Watch what happens if the AI proposes redeeming 8,000." | Click **Submit AI proposal of 8,000**. Show **REJECTED BY TREASURY POLICY**. |
| 1:05 | Review | "The Daml contract recomputes the route from ledger holdings. Only the verified 4,800 can be proposed." | Click **Accept funding route**. |
| 1:15 | Governance | "Treasury policy needs 2 of 3 independent operators." | Click **Approve as FinanceOp**, then **Execute settlement**: show it is rejected below threshold. |
| 1:35 | Governance | "Second approval, and execution is enabled." | Click **Approve as TreasuryOp**, then **Execute settlement**. |
| 1:50 | Settlement | "One atomic Canton transaction: redeem exactly 4,800, pay five people, create receipts. If redemption failed, nobody would be paid." | Show 5 lines **SETTLED**, *RWA shortfall funded 4,800*. |
| 2:10 | Privacy | "Same financial event, different authorized views. Each column is a separate ledger query as that party." | Point column by column. |
| 2:20 | Privacy, Finance | "Finance sees the whole payroll and the funding route." | |
| 2:30 | Privacy, Alice | "Alice sees only her own payment. Not Ben's salary, not the treasury." | Optionally switch a column to **Ben**. |
| 2:40 | Privacy, Auditor | "The auditor sees the total, line count and governance evidence, not salaries." | |
| 2:48 | Privacy, Outsider | "An outsider sees nothing. That's Canton's sub-transaction privacy, not UI hiding." | |
| 2:55 | — | "Lute: keep capital productive, route intelligently, approve collectively, settle privately." | End. |

## Honest notes to keep on screen or in voice-over

- Assets are DevNet test assets, not USDCx or USYC.
- Governance is native Daml 2-of-3; BitSafe decentralized-party governance is roadmap.
- The approve buttons are a **demo role switcher**, not authentication.
- MainNet: only the Grofty wallet connection page is MainNet; Lute's contracts run on DevNet.
