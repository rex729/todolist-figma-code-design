#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if command -v dart >/dev/null 2>&1 && dart --version >/dev/null 2>&1; then
  DART_CMD="dart"
elif [[ -x "/opt/homebrew/share/flutter/bin/cache/dart-sdk/bin/dart" ]]; then
  DART_CMD="/opt/homebrew/share/flutter/bin/cache/dart-sdk/bin/dart"
elif command -v flutter >/dev/null 2>&1; then
  DART_CMD="flutter dart"
else
  echo "[ERROR] 找不到 dart / flutter 指令，無法同步 shared/ 資源。" >&2
  exit 1
fi

exec $DART_CMD tool/sync_shared.dart "$@"
