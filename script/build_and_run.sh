#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-run}"
APP_NAME="fellowshow"
BUNDLE_ID="com.openbezal.fellowshow"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"
pkill -x "$APP_NAME" >/dev/null 2>&1 || true

run_dev() {
  bun run tauri dev
}

verify_launch() {
  local log_file="${TMPDIR:-/tmp}/fellowshow-codex-run.log"
  run_dev >"$log_file" 2>&1 &
  local dev_pid=$!
  for _ in {1..120}; do
    if pgrep -x "$APP_NAME" >/dev/null; then
      echo "$APP_NAME launched successfully"
      return 0
    fi
    if ! kill -0 "$dev_pid" >/dev/null 2>&1; then
      wait "$dev_pid"
      return $?
    fi
    sleep 1
  done
  echo "$APP_NAME did not launch within 120 seconds" >&2
  kill "$dev_pid" >/dev/null 2>&1 || true
  tail -n 40 "$log_file" >&2
  return 1
}

case "$MODE" in
  run)
    run_dev
    ;;
  --debug|debug)
    bun run tauri build --debug --no-bundle
    lldb -- "$ROOT_DIR/src-tauri/target/debug/$APP_NAME"
    ;;
  --logs|logs)
    run_dev &
    /usr/bin/log stream --info --style compact --predicate "process == \"$APP_NAME\""
    ;;
  --telemetry|telemetry)
    run_dev &
    /usr/bin/log stream --info --style compact --predicate "subsystem == \"$BUNDLE_ID\""
    ;;
  --verify|verify)
    verify_launch
    ;;
  *)
    echo "usage: $0 [run|--debug|--logs|--telemetry|--verify]" >&2
    exit 2
    ;;
esac
