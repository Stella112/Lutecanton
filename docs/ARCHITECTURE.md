# Architecture

## Authority chain

```
AI (packages/ai)           → recommendation text only
Router (packages/routing)  → verified numbers (pure, decimal-safe)
Daml (lute-core)           → recomputes and enforces policy; rejects any mismatch
Approvers                  → sign the proposal (native 2-of-3; BitSafe later)
Canton                     → executes atomically
```

## Daml workflow

1. **`PaymentBatch`**: signatory Treasury, observer FinanceViewer. Payees are *not* observers.
2. **`ProposeExecution`** (Treasury): fetches the policy and the listed holdings, recomputes the route with `Lute.Routing`, and aborts if `proposedRedeem` ≠ the verified redemption or the route is blocked. It consumes the batch and creates an `ExecutionProposal`.
3. **`Approve`** (approver): each approver becomes a **signatory** of the proposal. It rejects non-approvers and duplicates.
4. **`Execute`** (Treasury): requires approvals ≥ required. It re-fetches the policy (version must match), recomputes from live holdings (route, cash used and redemption must match), then in one transaction:
   - redeems the exact shortfall via `RedemptionFacility.Redeem`;
   - merges cash and pays each line (`Split` + `Transfer`);
   - creates one `PayeeReceipt` per payee, an `AuditReceipt` and a `FinanceReceipt`.

   Any failure rolls back everything.

### Why Treasury submits `Execute`

In Daml 3 the submitting party must be able to see every contract the transaction reads. Approvers intentionally cannot see treasury holdings, so they cannot submit. Their authority is carried by their signatures on the proposal, and `Execute` checks the threshold. The contract enforces the threshold; it does not depend on who presses the button.

### Explicit disclosure for redemption

`Redeem` pays out of the fund agent's private liquidity holding, which the treasury cannot see. The fund agent shares that contract as an explicit disclosure that is attached to the treasury's submission. This is the standard Canton pattern (CIP-56 registries do the same). Verified API (SDK 3.5.12): `queryDisclosure`, `actAs p <> discloseMany ds`.

## Visibility (stakeholders)

| Contract | Signatory | Observers |
|---|---|---|
| TreasuryPolicy | Treasury | FinanceViewer, approvers |
| PaymentBatch | Treasury | FinanceViewer |
| ExecutionProposal | Treasury + approvals | approvers, FinanceViewer |
| PayeeReceipt | Treasury | that payee |
| FinanceReceipt | Treasury | FinanceViewer |
| AuditReceipt | Treasury | Auditor |
| Holding | issuer | owner |
| RedemptionFacility | FundAgent | Treasury |

Consequences:

- Each payee sees only their own receipt and holding.
- The Auditor sees aggregates and governance evidence only.
- FundAgent sees its facility and redemption, not payroll.
- Outsider sees nothing.
- Approvers and FinanceViewer witness the full execution (they approve or administer it).
- CashIssuer sees transfers of its asset.

## Known limitations

- Native governance governs the Lute workflow, not custody. A single-key Treasury could transfer holdings outside Lute. Custody-level threshold control is the purpose of the BitSafe decentralized party (M6).
- Test assets are simple Daml holdings (spec §16 Fallback B), not CIP-56.
