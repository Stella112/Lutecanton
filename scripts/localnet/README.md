# Local Canton sandbox (single participant)

The full CN Quickstart LocalNet and the BitSafe multi-node bundle need ≥ 8 GB for Docker, which neither the dev laptop nor the shared build host has. Lute therefore runs locally on `dpm sandbox`: Canton 3.5.19 in one process (one participant, one synchronizer), in memory, no auth.

## On the build host (as the `lute` user)

```bash
cp sandbox.sh sandbox.conf ~/lute-sandbox/
bash ~/lute-sandbox/sandbox.sh start    # JVM capped at 1.2 GB; every API bound to 127.0.0.1
bash ~/lute-sandbox/sandbox.sh status
bash ~/lute-sandbox/sandbox.sh stop     # state is in memory: stopping resets the ledger
```

## From the laptop

```bash
ssh -N -L 6864:127.0.0.1:6864 optiongenome        # JSON Ledger API tunnel
pnpm --filter @lute/web dev                         # http://localhost:3000 (uploads the DAR, allocates parties)
LUTE_LEDGER_URL=http://localhost:6864 pnpm --filter @lute/domain test   # ledger e2e tests
```

## What this proves, and what it doesn't

- **Proves:** the real Daml model on a real Canton participant through the JSON Ledger API, with per-party reads, explicit disclosure and atomic rollback.
- **Doesn't prove:** multi-participant behaviour (all parties are hosted on one participant), authentication, or node-failure tolerance (S7). Those need DevNet or a larger host.
