#!/usr/bin/env bash
# Runs the Lute Canton sandbox on the build host as the `lute` user.
# Usage (on the host, as lute): bash sandbox.sh start|stop|status
# Memory-capped and loopback-only; see sandbox.conf.
set -euo pipefail
export PATH=$HOME/.dpm/bin:$HOME/opt/jdk/bin:$PATH
# Shared host: keep the JVM small. JAVA_TOOL_OPTIONS from .bashrc would add a second -Xmx.
unset JAVA_TOOL_OPTIONS
export JAVA_OPTS="-Xmx1200m -XX:+UseSerialGC"

DIR=$HOME/lute-sandbox
PIDFILE=$DIR/sandbox.pid
mkdir -p "$DIR"

running() { [[ -f $PIDFILE ]] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; }

case "${1:-status}" in
  start)
    if running; then echo "already running (pid $(cat "$PIDFILE"))"; exit 0; fi
    cd "$DIR"
    nohup dpm sandbox -c "$DIR/sandbox.conf" --no-tty --log-file-name "$DIR/canton.log" >"$DIR/stdout.log" 2>&1 &
    echo $! >"$PIDFILE"
    echo "started (pid $!)"
    ;;
  stop)
    if running; then
      # dpm launches java as a child: stop the whole process group of our pid only.
      pkill -TERM -P "$(cat "$PIDFILE")" || true
      kill "$(cat "$PIDFILE")" 2>/dev/null || true
      rm -f "$PIDFILE"
      echo stopped
    else
      echo "not running"
    fi
    ;;
  status)
    if running; then echo "running (pid $(cat "$PIDFILE"))"; else echo "not running"; fi
    ss -ltn | awk '{print $4}' | grep -E ':686[4-9]$' || true
    ;;
esac
