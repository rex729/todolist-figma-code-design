---
name: ios-implementer
description: >-
  當 AI Agent 在 iOS 實作分支（例如自訂的 `feat/ios-*` 分支或獨立 worktree）專責 iOS (SwiftUI + Moya + Lottie) 增量實作、同步 `origin/main` 規格差異與執行 TDD 測試驗證時使用此技能。
---

# iOS 專責開發代理規範 (`ios-implementer`)

> **使用方式**：開發者可將本檔案貼入欲執行 iOS 開發之分支的 `.agents/skills/ios-implementer/SKILL.md`（需一併補上所在分支名稱），或在對話開始時直接作為指引提供給 iOS 實作 Agent。

本技能定義 iOS 實作 Agent 的標準作業流程（SOP），確保在獨立分支與工作區內安全、增量且 1:1 對齊 `main` 規格地完成開發與驗證。

---

## 1. 邊界與分支鎖定（Guard）
1. **確認分支與目錄**：僅於您指派的 **iOS 實作分支**（非 `main` 分支）與對應獨立工作區執行修改。
2. **單一寫入範圍**：僅允許新增或修改 **`iOS/`** 目錄內的檔案。
3. **禁止私改共用來源**：嚴禁在實作分支擅自修改 `Android/`、`AGENTS.md`、`SPEC.md`、`DESIGN.md`、`README.md`、`FigmaDesigner/`、`shared/` 或 `firestore.rules`。

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
3. **只補缺口、跳過已完成項目**：對照本次 diff 與現有 `iOS/` 程式碼；凡已實作且仍符合最新規格與紅線的模組直接保留跳過，僅針對新增或異動需求開工。

---

## 3. 強制雙重前置阻斷關卡
實作、初始化或建置前，無條件優先執行並確認兩者皆回傳 Exit Code 0（任一失敗立即停止並回報）：
```bash
./check_env.sh --platform ios && ./setup_firebase.sh
```

---

## 4. 設計對齊與 TDD 實作規範
1. **Figma 原碼核對**：撰寫或修改 UI 前，先直接讀取 `FigmaDesigner/components.js` 與 `FigmaDesigner/screens/*.js` 原碼，1:1 映射 `DesignTokens` 與元件結構。
2. **iOS 專屬紅線**（對齊 `AGENTS.md` 6.1 與 `DESIGN.md` 5.2）：
   - `TARGETED_DEVICE_FAMILY = "1"`（Phone Only），`Info.plist` 僅列直向與倒立直向。
   - `.ignoresSafeArea()` 四邊全滿版延伸底色；前景內容避讓 Safe Area，不重複疊加 Figma 靜態頂部 `48`。
   - `AddTaskSheet` 採動態量測內容高度 `.presentationDetents([.height(contentHeight)])`（禁止 `[.medium, .large]` 與撐滿全高 `Spacer`），確保彈出軟鍵盤時底部剛好貼合鍵盤上緣；展開 `DatePicker` 前主動收起鍵盤。
   - `.sheet(item:)` 綁定之識別項不可隨表單輸入狀態改變而銷毀重建。
3. **TDD 流程（Red ➔ Green ➔ Refactor）**：
   - 先於 `iOS/{Project}Tests/` 撰寫或更新失敗測試並執行確認失敗（Red）。
   - 撰寫最小可行實作（SwiftUI + Moya + Firebase + Lottie），正式碼目錄嚴禁出現任何假 Token 或 Mock 資料。
   - 執行模擬器完整單元測試驗證（Green）：
     ```bash
     xcodebuild test -project iOS/{Project}.xcodeproj -scheme {Project} -destination 'platform=iOS Simulator,name=iPhone 18 Pro' -derivedDataPath iOS/DerivedData
     ```

---

## 5. 踩雷回流與交付收尾
1. **規格／系統限制回流（Spec Backflow）**：若實作或實機測試發現 iOS 框架級限制或規格缺漏，**禁止在本分支直接修改 `SPEC.md` / `AGENTS.md`**，請單獨列出「建議回饋給 `main` 的規格修改內容」呈報使用者，待 `main` 定案推上後再重新走第 2 步合併實作。
2. **交付回報**：確認全數測試通過後，列出實測通過數、變更檔案清單與模擬器驗證結果；待使用者確認或指示後再 `commit & push` 至您指定的 iOS 遠端分支。
