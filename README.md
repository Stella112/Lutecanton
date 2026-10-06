# Lute

## AI-assisted private treasury execution on Canton

> Keep capital productive. Route intelligently. Approve collectively. Settle privately.

Lute keeps treasury capital productive until the moment it has to pay, and only the right people see it move.

A treasury holds 20,000 liquid and 15,000 in a productive RWA. A 24,800 payroll is due. Lute uses the cash first, redeems **only the 4,800 shortfall** (10,200 stays invested), requires **2-of-3** treasury approvals, then pays everyone in one Canton transaction. Finance, each employee, the auditor and the fund see **different authorized views** of the same event.

Payroll is the demo use case. The category is private treasury execution.

## Status

Built for HackCanton Season 3. **Work in progress.** See [BUILD_STATUS.md](BUILD_STATUS.md) and [docs/CLAIMS.md](docs/CLAIMS.md). This README never claims more than CLAIMS.md.

| Area | State |
|---|---|
| Deterministic router (`packages/routing`) | 29 tests pass |
| Daml model (`daml/lute-core`) | 17 Daml Script tests pass: routing parity, 2-of-3, atomic rollback, AI overruled, per-party privacy |
| Running Canton ledger / HackCanton DevNet | not yet |
| BitSafe, Grofty / MainNet, Qwen | not yet |

All assets today are **mocks**: `cUSD-L` (MOCK LOCALNET PAYMENT ASSET) and `cMMF-L` (MOCK LOCALNET PRODUCTIVE RWA). They are not USDCx or USYC.

## Layout

```
packages/routing   deterministic funding router (TypeScript, bigint fixed-point)
daml/lute-core     policy, batch, governance, execution, receipts, mock test assets
daml/lute-tests    Daml Script scenario + parity tests
scripts/           Daml parity-test generator, VPS build driver
docs/              architecture, claims, verification log, open questions
```

## Run the tests

```bash
pnpm --filter @lute/routing test          # Node >= 24
node scripts/gen-daml-routing-cases.mjs   # regenerate Daml parity tests
cd daml && dpm build --all && cd lute-tests && dpm test   # needs JDK 17+ and dpm (SDK 3.5.12)
```

Design notes: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
