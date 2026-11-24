# 雙原生 AI Agent 平行協作手冊（僅供人類操作參考）

> **注意**：本文件僅供人類開發者／PM 開設獨立工作視窗與複製啟動指令使用，不納入 AI Agent 自動讀取的規格來源（`SPEC.md`、`DESIGN.md`、`README.md`、`AGENTS.md`）。

---

## 1. 工作區與專責規範對應

為避免強制綁定特定分支名稱，iOS 與 Android 專責實作指引已放在 `docs/` 目錄下：
- **iOS 指引**：[docs/IOS_IMPLEMENTER.md](./IOS_IMPLEMENTER.md)
- **Android 指引**：[docs/ANDROID_IMPLEMENTER.md](./ANDROID_IMPLEMENTER.md)

開發者可依團隊習慣自訂實作分支名稱（例如 `feat/ios-*`、`feat/android-*`），並在切出實作分支後將對應檔案貼入該分支的 `.agents/skills/`，或直接在對話 Prompt 中指定 AI Agent 閱讀。

| 視窗目錄（範例） | 分支（可自訂） | 職責與對應指引 |
| :--- | :--- | :--- |
| `todolist-figma-code-design/` | `main` | 人類／主代理維護 `SPEC.md`、`DESIGN.md`、`README.md`、`AGENTS.md`、`FigmaDesigner/`、`shared/` |
| `todolist-ios/` | 例如 `feat/ios-imple` | iOS Agent 專責實作（依 [docs/IOS_IMPLEMENTER.md](./IOS_IMPLEMENTER.md)） |
| `todolist-android/` | 例如 `feat/android-imple` | Android Agent 專責實作（依 [docs/ANDROID_IMPLEMENTER.md](./ANDROID_IMPLEMENTER.md)） |

---

## 2. 給 iOS 視窗的標準 Prompt

### 2.1 首次同步與確認指令權限
```text
請先確認目前位於我指定的 iOS 實作分支與獨立工作區（非 main）。
接著執行 `git fetch origin && git merge origin/main --no-edit`，讀取最新更新的 `AGENTS.md` 與 `docs/IOS_IMPLEMENTER.md`（或本分支 `.agents/skills/ios-implementer/SKILL.md`），並完全依照該規範完成增量盤點、前置檢查（`./check_env.sh --platform ios && ./setup_firebase.sh`）與 `xcodebuild test` 驗證後回報結果。
```

### 2.2 設定每 5 分鐘自動輪詢 `origin/main`（`*/5 * * * *`）
```text
/schedule 每 5 分鐘（*/5 * * * *）執行一次：
1. 執行 `git fetch origin && git rev-list --count HEAD..origin/main`。
2. 若結果為 0，什麼都不做直接結束這一輪。
3. 若結果 > 0，請依 `docs/IOS_IMPLEMENTER.md`（或本分支 `.agents/skills/ios-implementer/SKILL.md`）規範檢視 `origin/main` diff、合併更新、執行前置檢查與 TDD 增量實作並跑完 `xcodebuild test` 驗證，最後回報測試結果與變更清單（先別自動 push，等我確認）。
```

---

## 3. 給 Android 視窗的標準 Prompt

### 3.1 首次同步與確認指令權限
```text
請先確認目前位於我指定的 Android 實作分支與獨立工作區（非 main）。
接著執行 `git fetch origin && git merge origin/main --no-edit`，讀取最新更新的 `AGENTS.md` 與 `docs/ANDROID_IMPLEMENTER.md`（或本分支 `.agents/skills/android-implementer/SKILL.md`），並完全依照該規範完成增量盤點、前置檢查（`./check_env.sh --platform android && ./setup_firebase.sh`）與 `./Android/gradlew -p Android testDebugUnitTest assembleDebug` 驗證後回報結果。
```

### 3.2 設定每 5 分鐘自動輪詢 `origin/main`（`*/5 * * * *`）
```text
/schedule 每 5 分鐘（*/5 * * * *）執行一次：
1. 執行 `git fetch origin && git rev-list --count HEAD..origin/main`。
2. 若結果為 0，什麼都不做直接結束這一輪。
3. 若結果 > 0，請依 `docs/ANDROID_IMPLEMENTER.md`（或本分支 `.agents/skills/android-implementer/SKILL.md`）規範檢視 `origin/main` diff、合併更新、執行前置檢查與 TDD 增量實作並跑完 `./Android/gradlew -p Android testDebugUnitTest assembleDebug` 驗證，最後回報測試結果、變更清單與 APK 路徑（先別自動 push，等我確認）。
```

---

## 4. 日常插話提醒
- Agent 掛著定時排程休眠待命時，隨時可以直接在對話框送出新訊息喚醒它（例如要求「現在立即先檢查並實作一次」），背景排程會繼續保留運作。
