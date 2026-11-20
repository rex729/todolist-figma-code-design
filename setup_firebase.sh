#!/usr/bin/env bash
set -euo pipefail

# 切換至專案根目錄
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

PROJECT_ID="${FIREBASE_PROJECT_ID:-{firebaseProjectId}}"
FIRESTORE_LOCATION="${FIRESTORE_LOCATION:-asia-east1}"

if [[ "$PROJECT_ID" == "{firebaseProjectId}" || -z "$PROJECT_ID" ]]; then
  echo "❌ 尚未設定 Firebase Project ID！"
  echo "➜ 請先設定環境變數 FIREBASE_PROJECT_ID 或替換腳本中的 {firebaseProjectId} 佔位符。"
  exit 1
fi

echo "===================================================="
echo "   MCPTest Firebase / Cloud Firestore 自動化前置設定"
echo "===================================================="

# 1. 檢查必要設定檔與規則檔是否存在
for required_file in "firebase.json" ".firebaserc" "firestore.rules" "firestore.indexes.json"; do
  if [[ ! -f "$required_file" ]]; then
    echo "❌ 找不到必要檔案：$required_file"
    exit 1
  fi
done

# 2. 解析 Firebase CLI 指令（優先使用本機已安裝 CLI，否則透過 npx 取得最新版）
if command -v firebase >/dev/null 2>&1; then
  FIREBASE_CMD=(firebase)
elif command -v npx >/dev/null 2>&1; then
  FIREBASE_CMD=(npx -y firebase-tools@latest)
else
  echo "❌ 系統未安裝 firebase CLI 或 Node.js (npx)！"
  echo "➜ 修復指引：請安裝 Node.js 後執行 npm i -g firebase-tools，或確認 npx 可正常執行。"
  exit 1
fi

echo "➜ 使用 Firebase CLI：${FIREBASE_CMD[*]}（目標專案：${PROJECT_ID}）"

print_auth_error_and_exit() {
  local detail="${1:-}"
  echo ""
  echo "❌ Firebase CLI 尚未登入或登入憑證已失效，無法自動檢查／部署 Cloud Firestore 設定！"
  if [[ -n "$detail" ]]; then
    echo "   詳細原因：$detail"
  fi
  echo "➜ 修復指引：請先執行以下指令完成登入後，再重新執行 ./setup_firebase.sh："
  echo "   ${FIREBASE_CMD[*]} login --reauth"
  echo "   （若是首次登入可執行 ${FIREBASE_CMD[*]} login；無瀏覽器環境請加 --no-localhost）"
  exit 1
}

# 3. 檢查 Firebase CLI 登入狀態
echo "➜ 檢查 Firebase CLI 登入狀態..."
if ! LOGIN_OUTPUT="$("${FIREBASE_CMD[@]}" login:list 2>&1)"; then
  print_auth_error_and_exit "$LOGIN_OUTPUT"
fi
if echo "$LOGIN_OUTPUT" | grep -qiE "No authorized accounts|not logged in|Authentication Error|credentials are no longer valid|Failed to authenticate"; then
  print_auth_error_and_exit "$LOGIN_OUTPUT"
fi
echo "$LOGIN_OUTPUT" | grep -i "Logged in" || true

# 4. 檢查 Cloud Firestore (default) 資料庫是否存在；若無則自動建立 Standard Edition
echo "➜ 檢查 Cloud Firestore (default) 資料庫..."
if ! DB_LIST="$("${FIREBASE_CMD[@]}" firestore:databases:list --project "${PROJECT_ID}" 2>&1)"; then
  if echo "$DB_LIST" | grep -qiE "Authentication Error|reauth|credentials are no longer valid|not logged in|Command requires authentication"; then
    print_auth_error_and_exit "$DB_LIST"
  fi
  echo "❌ 無法查詢專案 ${PROJECT_ID} 的 Cloud Firestore 資料庫！"
  echo "$DB_LIST"
  echo "➜ 修復指引：請確認帳號具備專案 ${PROJECT_ID} 權限，且本機可正常連線至 firestore.googleapis.com。"
  exit 1
fi
echo "$DB_LIST"
if ! echo "$DB_LIST" | grep -q "(default)"; then
  echo "➜ 未偵測到 (default) 資料庫，正在自動建立（Standard Edition / ${FIRESTORE_LOCATION}）..."
  if ! CREATE_OUTPUT="$("${FIREBASE_CMD[@]}" firestore:databases:create "(default)" \
    --edition=standard \
    --location="${FIRESTORE_LOCATION}" \
    --project "${PROJECT_ID}" 2>&1)"; then
    echo "$CREATE_OUTPUT"
    if echo "$CREATE_OUTPUT" | grep -qi "Please retry in"; then
      echo "❌ 剛刪除的 (default) 資料庫仍在 Google Cloud 釋放冷卻期內，無法立即以同名稱重建。"
      echo "➜ 修復指引：請依上方提示等待冷卻秒數結束後，重新執行 ./setup_firebase.sh 即可自動建回並部署規則。"
    else
      echo "❌ 自動建立 Cloud Firestore (default) 資料庫失敗！"
      echo "➜ 修復指引：請確認帳號權限或手動於 Firebase Console 建立後重試。"
    fi
    exit 1
  fi
  echo "$CREATE_OUTPUT"
fi

# 5. 自動編譯並部署 Firestore Rules 與 Indexes
echo "➜ 正在自動部署 firestore.rules 與 firestore.indexes.json 至 Cloud Firestore..."
if ! "${FIREBASE_CMD[@]}" deploy --only firestore --project "${PROJECT_ID}"; then
  echo "❌ Cloud Firestore 安全規則或索引部署失敗！"
  echo "➜ 修復指引：請檢查上方錯誤訊息、firestore.rules 語法，或確認帳號權限後重試。"
  exit 1
fi

# 6. 同步 shared/ Firebase 設定與資源至 iOS / Android / Flutter
if [[ -x "./sync_shared.sh" ]]; then
  echo "➜ 正在同步 shared/ Firebase 設定與共用資源..."
  ./sync_shared.sh
fi

echo "✅ Firebase / Cloud Firestore 自動建庫（若缺失）、安全規則部署與資源同步完成！"
