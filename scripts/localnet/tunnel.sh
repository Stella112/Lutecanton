#!/usr/bin/env bash
# Self-healing SSH tunnel to the sandbox JSON Ledger API (localhost:6864).
# The network path occasionally resets long-lived connections; this reconnects.
# Usage: bash scripts/localnet/tunnel.sh   (Ctrl+C to stop)
HOST=${LUTE_VPS_HOST:-optiongenome}
while true; do
  ssh -N -o BatchMode=yes -o ExitOnForwardFailure=yes \
      -o ServerAliveInterval=15 -o ServerAliveCountMax=4 \
      -L 6864:127.0.0.1:6864 "$HOST"
  echo "$(date +%T) tunnel dropped (exit $?); reconnecting in 3s" >&2
  sleep 3
done
