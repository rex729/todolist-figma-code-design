#!/usr/bin/env bash
set -e

# 切換至專案根目錄
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# 防呆：優先使用可執行的 Dart SDK（支援一般終端與沙盒唯讀環境）
if command -v dart >/dev/null 2>&1 && dart --version >/dev/null 2>&1; then
  DART_CMD="dart"
elif [[ -x "/opt/homebrew/share/flutter/bin/cache/dart-sdk/bin/dart" ]]; then
  DART_CMD="/opt/homebrew/share/flutter/bin/cache/dart-sdk/bin/dart"
elif command -v flutter >/dev/null 2>&1; then
  DART_CMD="flutter dart"
else
  echo -e "\033[31m[ERROR] 系統未安裝或未將 Dart SDK 加入 PATH（check_env CLI 執行所需）！\033[0m"
  echo -e "\033[33m請先確認系統可執行 dart 指令\033[0m"
  exit 1
fi

exec $DART_CMD tool/check_env.dart "$@"
