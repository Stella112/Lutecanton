# Codex review queue

## Milestone
M1–M5 + core M7 (local sandbox). DevNet is pending a NODERS invite.

## What changed
Daml model (`daml/lute-core`), router, ledger client, domain service, AI layer, Next.js backend and screens.

## Files to inspect
- `daml/lute-core/daml/Lute/Workflow.daml`: authority, recomputation, atomic Execute.
- `daml/lute-core/daml/Lute/TestAsset.daml`: Holding Split/Merge/Transfer, RedemptionFacility.Redeem.
- `packages/domain/src/service.ts`: what each action submits, as which party; disclosure.
- `packages/canton/src/client.ts`: party-scoped ACS reads.
- `packages/ai/src/index.ts`: AI input minimisation, output validation.
- `apps/web/src/server/lute.ts` and `apps/web/src/app/api/**`: error mapping, CSRF guard, demo-tool gating.

## Commands to run
- `pnpm --filter @lute/routing test`
- `pnpm --filter @lute/ai test`
- `cd daml && dpm build --all && cd lute-tests && dpm test`
- `LUTE_LEDGER_URL=http://localhost:6864 pnpm --filter @lute/domain test` (needs the sandbox + tunnel)

## Security invariants
- No secrets client-side; DevNet credentials only in the root `.env` (server).
- Sandbox APIs bound to 127.0.0.1.
- Demo tools are off unless `LUTE_DEMO_TOOLS=true`.
- No arbitrary template/choice execution from user input.

## Privacy invariants
- Payees are not observers of PaymentBatch.
- Each role view = an ACS query filtered to exactly one party.
- Auditor sees AuditReceipt only.
- FundAgent never sees payroll.
- Outsider sees nothing.

## Financial invariants
- Daml recomputes the route from holdings at propose and at execute; proposed redemption must equal verified.
- Decimal strings and bigint only, no floats.
- One batch → at most one live proposal; Execute consumes the proposal (no double settlement).

## External claims being made
See `docs/CLAIMS.md`. Nothing on DevNet or MainNet beyond the Grofty read-only connection.

## Known risks
- Approvers and FinanceViewer witness individual lines (they are stakeholders of ExecutionProposal).
- Native governance does not bind custody: a single-key Treasury could move holdings outside Lute.
- On DevNet one team user can read all team parties; views rely on per-party filters.
- The backend reads FundAgent's liquidity to build the disclosure (single demo operator).

## Questions for Codex
1. Can any party cause Execute to pay a different set of lines or amounts than were approved?
2. Can a disclosed liquidity contract be abused to redeem more than `capacity`?
3. Are there any paths where an API error is rendered as success?
