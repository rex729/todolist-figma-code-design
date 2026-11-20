# 功能與需求規格書 (SPEC.md)

> **文件狀態**：Accepted / 規格已定案（已完成 `/grill-me-doc` 深度訪談收斂，可作為三平台 TDD 與實作依據）。

## 1. 專案概述
本專案（`MCPTest`）為一個整合 **Figma Design-as-Code** 與 **Firebase（Google Sign-In + Cloud Firestore）** 的跨平台行動裝置 TodoList 待辦事項管理系統，預計於 **iOS（SwiftUI）**、**Android（Jetpack Compose）** 與 **Flutter（僅支援 Android 與 iOS 雙行動平台，不支援 Web / macOS / Windows / Linux）** 提供 1:1 對齊同一套設計系統的應用程式體驗。

### 1.1 支援裝置與螢幕方向規格
- **支援裝置（Device Support）**：**僅支援手機（Phone Only）**，不支援平板（iPad / Android Tablet）或桌面裝置。
- **螢幕方向（Orientation）**：僅支援**直向（Portrait）**與**倒立直向（Portrait Upside Down）**，不支援橫向（Landscape）。

---

## 2. 領域術語表 (Domain Glossary)

為確保設計端（Figma）、產品規格與 iOS / Android / Flutter 三平台程式碼認知完全一致，專案內統一使用以下領域詞彙：

| 術語 (Term) | 英文代號 / 識別碼 | 定義與業務語意 | 範例 / 允許值 |
| :--- | :--- | :--- | :--- |
| **待辦事項** | `TodoItem` / `Todo` | 使用者記錄的一項工作任務，為系統的核心業務實體。 | 包含標題、到期日、執行狀態 |
| **任務標題** | `title` | 待辦事項的主要文字內容。 | `"Buy groceries"` |
| **到期日** | `dueDate` | 該事項預計完成的日期。資料庫採 ISO `yyyy-mm-dd` 儲存，UI 列表顯示格式為 `MMM d`（例如 `Nov 20`）。 | 儲存：`2026-11-20`；顯示：`Nov 20` |
| **進度狀態** | `status` | 待辦事項當前的執行生命週期，對齊 Figma `ToDoCellItem` Variants。 | `TODO`、`IN PROGRESS`、`DONE` |
| **使用者識別碼** | `uid` | Firebase Authentication 派發之全域唯一使用者 ID，用於 Cloud Firestore 資料隔離。 | Firebase UID 字串 |
| **唯一真理來源** | `SSOT` | UI 視覺與 Token 以 `README.md` / Figma 為準；產品與架構規格以 `SPEC.md` / `DESIGN.md` 為準。 | — |

---

## 3. 使用者角色與身分驗證規格 (Authentication & Authorization)

### 3.1 登入與生命週期
- **登入方式**：僅支援 **Google 帳號登入**（透過原生 Google Sign-In 換取憑證並登入 Firebase Authentication）。
- **未登入狀態**：App 啟動時若未偵測到有效的 Firebase User Session，導向 **`Login` 畫面**（`Login Screen`）。
- **登入流程**：點擊 `Google Login Button`（`"Continue with Google"`）進入授權載入狀態（`Authenticating`）；若成功則寫入 Session 並重置導覽堆疊進入 **`Main` 畫面**；若失敗或取消則停留於 `Login` 畫面並顯示 `status/danger` 錯誤提示。
- **已登入狀態**：進入 **`Main` 畫面**，可檢視、新增與更新個人專屬的待辦事項。
- **資料隔離原則**：Cloud Firestore Security Rules 與客戶端查詢嚴格限定僅能讀寫當前登入者自己的 `uid` 路徑（`/users/{uid}/todos/{todoId}`），禁止跨使用者存取。

---

## 4. 待辦事項 (`TodoItem`) 資料欄位定義（已定案：3 欄位）

經 `/grill-me-doc` 訪談定案，本專案維持對齊現行 Figma `ToDoCellItem` 與 `AddTaskSheet` 的 **3 個核心業務欄位**（不擴充 `category` 或 `notes`）：

| 欄位名稱 | 型別 | 必填 | 格式 / 限制 | 預設值 | 對應 Figma 元件與屬性 |
| :--- | :--- | :---: | :--- | :---: | :--- |
| **`id`** | String | 是 (系統生成) | Cloud Firestore Document ID | 自動生成 | 無（由 Firestore 派發） |
| **`title`** | String | 是 | 非空字串，去空白後 1~100 字元 | 無 | `AddTaskSheet` 內 `"Task Title"` (`AppTextField`)；`ToDoCellItem` `Title` |
| **`dueDate`** | String | 是 | 嚴格 ISO `yyyy-mm-dd` 格式（預設帶入當日）；UI 顯示 `MMM d` | 當日日期 | `AddTaskSheet` 內 `"Due Date"` (`AppTextField`，點擊開啟系統 DatePicker)；`ToDoCellItem` `Due Date` |
| **`status`** | Enum | 是 | 僅限：`TODO`、`IN PROGRESS`、`DONE` | `TODO` | `ToDoCellItem` Variants：`Status=TODO` / `Status=IN PROGRESS` / `Status=DONE` |

---

## 5. 介面與互動流程 (UI / UX Flow — 對齊 `README.md` 第 7 節)

### 5.1 登入頁面 (`Login` Screen)
- 畫面中央配置 `Google Login Button`（`"Continue with Google"`，內嵌 `Icon/google`）。
- 點擊後進入 `Authenticating`（`isLoading = true`）並觸發 Google Sign-In + Firebase Auth 流程：
  - 載入期間**禁用 `Google Login Button` 防止重複點擊**，並於按鈕內顯示 **Lottie Loading Indicator**（依 Light / Dark Mode 切換 `shared/animations/circle-loader-light.json` / `circle-loader-dark.json`，尺寸 `size/icon-md = 20px`，循環播放）。
  - 若登入失敗或使用者取消授權，立即停止 Loading、恢復按鈕可點擊，並於畫面顯示 `status/danger` 錯誤提示。

### 5.2 主頁面 (`Main` Screen)
1. **`TopNavBar`**：左側顯示標題 `"My Todo List"`（`Heading/H1`），右側顯示 `"+ Add"` 主按鈕。
2. **`ListView`**：透過 Cloud Firestore 即時監聽（`snapshots`）垂直條列展示使用者的 `ToDoCellItem` 項目（標題、格式化到期日如 `Nov 20`、右側狀態膠囊按鈕），預設依 **`dueDate` 升冪排序**（最早／最近到期排在最上方）。
3. **狀態快速推進、編輯與刪除**：
   - 點擊單筆列右側的狀態膠囊按鈕，可依序循環切換 **`TODO` ➔ `IN PROGRESS` ➔ `DONE` ➔ `TODO`**，並即時同步回寫 Cloud Firestore。
   - 點擊卡片本體開啟 `AddTaskSheet` 編輯既有標題與到期日（重用同元件，按鈕改為儲存變更）。
   - 支援卡片向左滑動顯示紅色 `Delete` 動作按鈕（底色 `status/danger` `#EF4444`、內嵌反白着色之 **`Icon/trash` (`ic_trash.svg`)**），**點擊 `Delete` 後**採 **硬刪除（Hard Delete）** 直接自 Cloud Firestore 抹除該筆文件（避免誤滑直接刪除）。
4. **`AddTaskSheet`（新增／編輯待辦 Bottom Sheet）**：
   - 點擊右上角 `"+ Add"`（新增模式，標題 `"New Todo Item"`、主按鈕 `"Add Task"`、`dueDate` 預設帶入當日）或點擊既有卡片（編輯模式，標題 `"Edit Todo Item"`、主按鈕 `"Save"`、**預先帶入原有 `title` 與 `dueDate`**）喚起 `AddTaskSheet` 彈窗（`Elevated` 底色與 `Elevation/Modal` 陰影）。
   - 包含 `"Task Title"` 與 `"Due Date"`（點擊開啟系統 DatePicker）兩個 `AppTextField`，以及 `"Cancel"`（Secondary）與主按鈕兩個 `AppButton`。
   - **送出防連點與關閉**：點擊送出時先驗證標題非空白（失敗則顯示提示且不關閉）；驗證通過後**鎖定主按鈕並於按鈕內顯示 Lottie Loading Indicator（藍底按鈕使用反白版 `shared/animations/circle-loader-on-brand.json`，尺寸 `size/icon-md = 20px`，循環播放）防連點**，待 Firestore 寫入完成（或離線快取排隊完成）後自動關閉。**點擊 `"Cancel"`、背景遮罩或下滑手勢**皆取消本次變更並關閉彈窗（送出寫入期間暫禁遮罩/手勢誤關）。
5. **登出操作 (`LogOut`)**：
   - `Main Screen` 最下方配置 `"LogOut"` 按鈕（底部間距 `spacing/3xl` = `32px`）。
   - 點擊 `"LogOut"` 按鈕立即執行登出（清除 Firebase Auth Session / Google Sign-In 狀態），並透過 Routing 導回 `Login Screen`。

---

## 6. 驗收標準草案 (Acceptance Criteria, BDD)

```gherkin
場景 1: Google 登入成功導向主畫面
  假設 使用者尚未登入並停留在 Login Screen
  當 使用者點擊 "Continue with Google" 並完成 Google 授權
  那麼 Firebase Authentication 建立有效登入工作階段
  並且 App 自動切換至 Main Screen 並載入該 uid 底下的待辦事項

場景 2: 透過 AddTaskSheet 新增待辦事項
  假設 使用者已登入並停留在 Main Screen
  當 使用者點擊右上角 "+ Add" 開啟 AddTaskSheet
  並且 填寫標題與到期日後點擊 "Add Task"
  那麼 系統將新待辦事項寫入 Cloud Firestore /users/{uid}/todos（預設狀態為 TODO）
  並且 關閉 Bottom Sheet，ListView 顯示該筆新項目

場景 3: 點擊狀態膠囊循環更新進度
  假設 Main Screen ListView 中有一筆狀態為 "TODO" 的待辦事項
  當 使用者點擊該筆右側的狀態膠囊按鈕
  那麼 該筆狀態依 TODO -> IN PROGRESS -> DONE -> TODO 循環推進並同步至 Firestore

場景 4: 標題為空白時阻擋送出
  當 使用者在 AddTaskSheet 未輸入標題或僅輸入空白即點擊 "Add Task"
  那麼 表單顯示錯誤提示且不對 Cloud Firestore 發起寫入

場景 5: 編輯與左滑硬刪除待辦事項
  假設 Main Screen ListView 中有一筆既有的待辦事項
  當 使用者點擊卡片本體開啟 AddTaskSheet（預填原有資料），修改標題或到期日後點擊 "Save"
  那麼 主按鈕進入 Loading 鎖定狀態，待 Firestore 更新完成後關閉彈窗並即時重繪列表
  當 使用者將該筆卡片向左滑動並點擊紅色 "Delete" 動作按鈕
  那麼 系統自 Firestore 硬刪除該筆文件並自列表移除

場景 6: 點擊 LogOut 按鈕登出
  假設 使用者目前位於 Main Screen
  當 使用者點擊最下方的 "LogOut" 按鈕
  那麼 系統清除 Firebase Auth 與 Google Sign-In 登入狀態
  並且 透過 Routing 重置導覽堆疊導回 Login Screen
```

---

## 7. 邊界條件與例外處理 (Edge Cases)
1. **登入失敗或使用者取消授權**：停止載入狀態並顯示錯誤提示（`status/danger`），維持在 `Login` 畫面不崩潰。
2. **無資料空狀態（Empty State）**：新帳號或待辦清單為空時，`Main Screen` 的 `ListView` 區域顯示友善空狀態引導提示（例如「尚未建立待辦事項，點擊右上角 + Add 開始記錄！」），並保留底部的 `"LogOut"` 按鈕可點擊。
3. **離線與即時同步**：啟用 Cloud Firestore 預設本地離線快取與即時監聽（`snapshots`），離線時可繼續檢視快取並排隊寫入；若遇權限錯誤或異常寫入失敗則顯示錯誤提示（`status/danger`）。
4. **Light / Dark Mode 切換**：三平台畫面須依據 `README.md` 的語意化 Code Syntax 自動響應系統深淺色模式。
5. **裝置與方向限制（Phone Only + Portrait / Portrait Upside Down）**：三平台皆限定為手機裝置（Phone Only），且螢幕方向僅支援直向（Portrait）與倒立直向（Portrait Upside Down），不開放橫向旋轉或平板分割視窗（Split View）。
