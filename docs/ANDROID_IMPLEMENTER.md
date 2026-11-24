---
name: android-implementer
description: >-
  當 AI Agent 在 Android 實作分支（例如自訂的 `feat/android-*` 分支或獨立 worktree）專責 Android (Jetpack Compose + Retrofit + Lottie) 增量實作、同步 `origin/main` 規格差異與執行 TDD 測試／APK 打包時使用此技能。
---

# Android 專責開發代理規範 (`android-implementer`)

> **使用方式**：開發者可將本檔案貼入欲執行 Android 開發之分支的 `.agents/skills/android-implementer/SKILL.md`（需一併補上所在分支名稱），或在對話開始時直接作為指引提供給 Android 實作 Agent。

本技能定義 Android 實作 Agent 的標準作業流程（SOP），確保在獨立分支與工作區內安全、增量且 1:1 對齊 `main` 規格地完成開發與驗證。

---

## 1. 邊界與分支鎖定（Guard）
1. **確認分支與目錄**：僅於您指派的 **Android 實作分支**（非 `main` 分支）與對應獨立工作區執行修改。
2. **單一寫入範圍**：僅允許新增或修改 **`Android/`** 目錄內的檔案。
3. **禁止私改共用來源**：嚴禁在實作分支擅自修改 `iOS/`、`AGENTS.md`、`SPEC.md`、`DESIGN.md`、`README.md`、`FigmaDesigner/`、`shared/` 或 `firestore.rules`。

---

## 2. 同步 `origin/main` 與增量落差盤點（Gap Analysis）
1. 執行遠端抓取並檢視規格異動 diff：
   ```bash
   git fetch origin
   git diff HEAD..origin/main -- AGENTS.md SPEC.md DESIGN.md README.md FigmaDesigner/ shared/
   ```
2. 合併 `origin/main` 更新（若無衝突）：
   ```bash
   git merge origin/main --no-edit
   ```
3. **只補缺口、跳過已完成項目**：對照本次 diff 與現有 `Android/` 程式碼；凡已實作且仍符合最新規格與紅線的模組直接保留跳過，僅針對新增或異動需求開工。

---

## 3. 強制雙重前置阻斷關卡
實作、初始化或建置前，無條件優先執行並確認兩者皆回傳 Exit Code 0（任一失敗立即停止並回報）：
```bash
./check_env.sh --platform android && ./setup_firebase.sh
```

---

## 4. 設計對齊與 TDD 實作規範
1. **Figma 原碼核對**：撰寫或修改 UI 前，先直接讀取 `FigmaDesigner/components.js` 與 `FigmaDesigner/screens/*.js` 原碼，1:1 映射 `Color` / `Spacing` / `Typography` Tokens 與元件結構（並確認 `res/drawable/` 向量圖示與 `FigmaDesigner/assets/icons/*.svg` 一致）。
2. **Android 專屬紅線**（對齊 `AGENTS.md` 6.1 與 `DESIGN.md` 5.1）：
   - `enableEdgeToEdge()` 四邊全滿版延伸底色，前景內容再套用 `safeDrawingPadding()`（不重複疊加 Figma 靜態頂部 `48`）；Activity 方向鎖定 `sensorPortrait`。
   - Google 登入採用 Credential Manager `GetSignInWithGoogleOption`（避免無預存帳號裝置直接觸發 `NoCredentialException`）。
   - `ModalBottomSheet` 禁止外層掛 `Modifier.shadow(...)` 與子層重複塗底色蓋過圓角；傳入 `rememberModalBottomSheetState` 之 lambda 必須透過 `rememberUpdatedState` + `remember { { ... } }` 鎖定參考，避免打字重組重建 `SheetState`。
3. **TDD 流程（Red ➔ Green ➔ Refactor）**：
   - 先於 `Android/app/src/test/` 撰寫或更新失敗測試（含帶輸入框彈窗逐幀穩定性測試）並執行確認失敗（Red）。
   - 撰寫最小可行實作（Jetpack Compose + Retrofit + Firebase + Lottie），正式碼目錄嚴禁出現任何假 Token 或 Mock 資料。
   - 執行單元測試與 Debug APK 打包驗證（Green）：
     ```bash
     ./Android/gradlew -p Android testDebugUnitTest assembleDebug
     ```

---

## 5. 踩雷回流與交付收尾
1. **規格／系統限制回流（Spec Backflow）**：若實作或實機測試發現 Android 框架級限制或規格缺漏，**禁止在本分支直接修改 `SPEC.md` / `AGENTS.md`**，請單獨列出「建議回饋給 `main` 的規格修改內容」呈報使用者，待 `main` 定案推上後再重新走第 2 步合併實作。
2. **交付回報**：確認全數測試通過且 APK 建置成功後，回報測試通過數量、變更檔案清單與 `Android/app/build/outputs/apk/debug/app-debug.apk` 路徑；待使用者實機確認或指示後再 `commit & push` 至您指定的 Android 遠端分支。
