# 專案 AI 代理協作規範 (AGENTS.md)

本檔案為跨 AI 工具（GitHub Copilot、Antigravity、Claude Code、Codex、Cursor 等）通用的專案導覽與強制規則。所有 AI 代理在規劃、討論、修改設計稿腳本或撰寫程式碼前，皆須先閱讀並嚴格遵守以下規範。

---

## 1. 核心上下文檔案（記憶持久化與唯一真理來源 SSOT）

在進行任何規劃、討論或撰寫程式碼之前，請先檢查並閱讀專案根目錄下的以下檔案：

- **[README.md](./README.md)**：Figma Design System 唯一真理來源，記錄完整 Design Tokens（`ColorCollection`、`SpacingCollection`、`Text Styles`、`Effect Styles`）、AI 雙核心工作流、App 狀態流轉圖，以及 Figma 各頁面與元件規格。
- **[SPEC.md](./SPEC.md)**：功能與需求規格書，記錄產品需求、**領域術語表 (Glossary)**、使用者流程、BDD 驗收標準（AC）與邊界條件。
- **[DESIGN.md](./DESIGN.md)**：系統架構與技術設計書，記錄三平台直連 Firebase Auth + Cloud Firestore 架構、資料模型、共用憑證設定與**架構決策記錄 (ADRs)**。
- **`FigmaDesigner/`**：本專案之 Figma **Design-as-Code** 設計源頭與官方本機外掛所在目錄。
- **`shared/firebase/`**：Android / iOS / Flutter 三平台共用的 Firebase 設定檔唯一真理來源（`google-services.json`、`GoogleService-Info.plist`）。
- **[toolchain.json](./toolchain.json)**：跨平台（iOS / Android / Flutter）開發與建置工具版本唯一真理來源。

---

## 2. 前置作業強制規範（環境檢查 ➔ Firebase / Cloud Firestore 設定）

### 2.1 環境與 Toolchain 預檢 (`check_env`)

1. **實作前無條件優先執行預檢**：在執行任何三平台（`iOS/`、`Android/`、`Flutter/`）專案初始化、建置、測試或撰寫應用程式碼前，**必須優先執行根目錄環境預檢腳本**：
   - **macOS / Linux / CI 環境**：`./check_env.sh`
   - **Windows 環境**：`check_env.bat`
2. **前置阻斷原則**：環境預檢腳本將依據 [`toolchain.json`](./toolchain.json) 進行嚴格比對。若預檢未通過（Exit Code 1），嚴禁進行任何後續平台初始化、建置或開發，必須先依腳本輸出之修復指引排除環境問題，確認全數通過（Exit Code 0）後方可繼續。
3. **Figma / 純規格檔例外**：僅編輯 `FigmaDesigner/` 設計稿腳本或進行 `SPEC.md` / `DESIGN.md` 純文字規劃時不需阻斷，但一旦切換至三平台開發流程，一律先跑 `check_env`。

### 2.2 Firebase 與 Cloud Firestore 自動化前置設定（雙重前置阻斷關卡）

1. **開工前無條件強制執行（禁止沿用他分支或先前紀錄）**：
   - 每當**切換／建立新開發分支**，或開始**任一單一平台**（`iOS/`、`Android/`、`Flutter/`）專案初始化、撰寫業務程式碼、建置或實機驗收前，**必須在當下緊接 `./check_env.sh` 之後重新執行 `./setup_firebase.sh`**：
     ```bash
     ./check_env.sh && ./setup_firebase.sh
     ```
   - **禁止假設雲端狀態未變**：即使剛才已在 `main` 或其他分支跑過，切出新分支或換下一個平台開發時仍必須重跑一次，即時驗證雲端 `(default)` Firestore 資料庫存在與規則生效。
2. **前置阻斷原則**：
   - 若 `./setup_firebase.sh` 未通過（Exit Code != 0，例如 Firebase CLI 未登入、憑證失效、無權限或建庫／規則發佈失敗），**嚴禁開始任何平台初始化、撰寫程式碼或建置**，必須先依腳本輸出之中文修復指引排除問題，確認回傳 Exit Code 0 後方可繼續。
3. **自動化腳本執行項目（預設目標專案 `{firebaseProjectId}`、區域 `asia-east1`）**：
   - [`./setup_firebase.sh`](./setup_firebase.sh) 會自動完成以下 4 步驟：
     1. 驗證 `firebase.json`、`.firebaserc`、[`firestore.rules`](./firestore.rules) 與 `firestore.indexes.json` 存在，並檢查 Firebase CLI 登入狀態。
     2. 檢查專案的 **`(default)`** Cloud Firestore 資料庫（Standard Edition）；**若尚未建立則自動執行 `firebase firestore:databases:create "(default)" --edition=standard --location=asia-east1` 建立**。
     3. 自動執行 `firebase deploy --only firestore`，將 [`firestore.rules`](./firestore.rules) 與 `firestore.indexes.json` 編譯並發佈至雲端（避免 Production mode 預設拒絕讀寫造成 `[cloud_firestore/permission-denied]`）。
     4. 自動呼叫 `./sync_shared.sh`，將 [`shared/firebase/`](./shared/firebase) 與共用資源同步至 `Android/`、`iOS/`、`Flutter/`。
4. **Firebase Authentication（Google Sign-In）前置確認**：
   - 若尚未取得 OAuth Client ID，仍須於 Firebase Console 啟用 **Google** 登入提供者並登錄 Android App（`{packageName}`）之 **SHA-1 / SHA-256** 指紋，將最新 [`google-services.json`](./shared/firebase/google-services.json)（含 `oauth_client`）與 [`GoogleService-Info.plist`](./shared/firebase/GoogleService-Info.plist)（含 `CLIENT_ID` / `REVERSED_CLIENT_ID`）更新至 `shared/firebase/` 後再次執行 `./sync_shared.sh`。
5. **安全規則要求**：
   - [`firestore.rules`](./firestore.rules) 必須針對 `/users/{uid}/todos/{todoId}` 落實已驗證擁有者隔離（`request.auth != null && request.auth.uid == uid`）、5 欄位白名單（`title`、`dueDate`、`status`、`createdAt`、`updatedAt`）與 `createdAt` 不可變驗證，並預設拒絕其餘路徑。

---

## 3. 深度訪談與規格文檔化（`grill-me-doc`）規則

本專案已內建 [`.agents/skills/grill-me-doc/SKILL.md`](./.agents/skills/grill-me-doc/SKILL.md)。當與使用者進行需求釐清、架構討論或執行 `/grill-me-doc` 時：

1. **先查後問（Explore Before Asking）**：能從專案現有檔案（`README.md`、`SPEC.md`、`DESIGN.md`、`shared/firebase/`、`FigmaDesigner/`）得知的事實，請自行查閱，切勿重複詢問使用者。
2. **走訪決策樹與逐題推進**：依架構相依性拆解決策樹，每次聚焦詢問一個核心問題（支援選擇題工具時優先使用），並附帶推薦答案（標註 `(Recommended)`）與簡短理由。
3. **達成共識前禁止寫實作程式碼（No Code Until Consensus）**：在關鍵架構分支、資料模型、Firebase 規則與邊界條件達成完全共識前，嚴禁盲目開始撰寫 `iOS/`、`Android/`、`Flutter/` 實作程式碼。
4. **自動文檔化同步**：每當訪談達成階段性共識時，主動建立或更新 [SPEC.md](./SPEC.md)、[DESIGN.md](./DESIGN.md)、領域術語表與 ADR。
5. **全繁體中文**：所有說明、文件與程式碼註解皆以**繁體中文（台灣習慣用語）**撰寫。

---

## 4. `FigmaDesigner/` 目錄架構與編輯規範

```text
FigmaDesigner/
├── manifest.json             # Figma Desktop 官方 Plugin 設定檔
├── build_plugin.sh           # 打包腳本（自動組裝以下模組為 plugin/code.js 與 plugin/ui.html）
├── foundations.js            # Layer 1: 色彩、間距、字級、陰影基礎定義
├── components.js             # Layer 2: 獨立 Components Page (Icons Library 與共用元件組)
├── helpers/
│   └── figma_helpers.js      # 共用工具函式 (字體載入、Token 綁定器、頁面排序與防重複清理)
├── screens/                  # Layer 3: 一畫面一檔，統一建構於 Screens Page
│   ├── login.js              # Login Screen (x = 0)
│   ├── main.js               # Main Screen (x = 457)
│   └── setting.js            # Setting Screen (x = 914)
├── assets/icons/*.svg        # 向量圖示原始檔
└── plugin/                   # ⚠️ 自動生成產物目錄，禁止手動編輯
    ├── code.js
    └── ui.html
```

### 4.1 ⚠️ Figma Plugin 強制同步規範 (CRITICAL)

1. **禁止手動修改生成物**：`FigmaDesigner/plugin/code.js` 與 `FigmaDesigner/plugin/ui.html` 皆由 `build_plugin.sh` 自動生成，任何情況下都**禁止直接編輯這兩個檔案**。
2. **改完腳本必跑 Build**：凡新增、修改或刪除以下任何檔案後，**必須立即執行**打包腳本（`build_plugin.sh` 會自動寫入更新時間供 Figma Hot Reload 面板顯示）：
   - `FigmaDesigner/foundations.js`
   - `FigmaDesigner/components.js`
   - `FigmaDesigner/helpers/*.js`
   - `FigmaDesigner/screens/*.js`

   ```bash
   sh FigmaDesigner/build_plugin.sh && node --check FigmaDesigner/plugin/code.js
   ```

### 4.2 修改與新增 Figma 頁面的標準流程

1. **只改目標頁面**：修改既有頁面時，僅編輯對應的 `FigmaDesigner/screens/<name>.js`（例如 `login.js`、`main.js`），不可影響其他頁面。
2. **新增頁面**：
   - 在 `FigmaDesigner/screens/` 下建立新檔案（例如 `setting.js`），頂層採用標準格式（因應 Figma Starter 方案 3 頁上限，所有畫面統一呼叫 `ctx.getOrCreateScreensPage()` 建構於共用 `Screens` Page，並以 `ctx.placeScreenOnCanvas(screensPage, screenFrame, slotIndex)` 橫向等距排列）：
     ```javascript
     (async () => {
       const ctx = await createFigmaDesignerContext();
       const screensPage = await ctx.getOrCreateScreensPage();
       // 建構該頁面內容並透過 ctx.placeScreenOnCanvas(screensPage, screenFrame, slotIndex) 擺放...
       await ctx.cleanupEmptyPage1AndSort();
     })();
     ```
   - 執行 `sh FigmaDesigner/build_plugin.sh` 後，外掛面板 `plugin/ui.html` 會自動掃描 `screens/*.js` 並新增該頁面的獨立重建按鈕，無須手動修改 UI 或主程式。
3. **強制 Token 與 Auto Layout 規範**：
   - 所有容器必須開啟 Auto Layout（`layoutMode = 'VERTICAL' | 'HORIZONTAL'`），禁止以絕對座標堆疊版面。
   - 所有顏色、圓角、間距、字級與陰影必須透過 `ctx.bindFill`、`ctx.bindStroke`、`ctx.bindFloat`、`ctx.applyTextStyle`、`ctx.applyEffectStyle` 綁定既有 Tokens，禁止寫死數值。
   - 每支頁面腳本開頭必須先清理該頁既有的同名畫面或殘留空白 Frame，確保可無限次重複執行而不產生重複圖層。
4. **同步文件**：完成設計變更後，同步更新 [README.md](./README.md) 第 7 節與 [SPEC.md](./SPEC.md) 之頁面與元件規格說明。

---

## 5. 測試驅動開發（TDD）強制規範

本專案進入實作階段後，所有平台功能開發與修改皆**必須嚴格遵循 TDD 流程**：
1. **Red（先寫失敗測試）**：在撰寫任何功能實作程式碼前，必須根據 [SPEC.md](./SPEC.md) 與 [DESIGN.md](./DESIGN.md) 先撰寫測試，並實際執行確認其失敗（Red）。
2. **Green（撰寫最小可行實作）**：撰寫剛好能通過測試的程式碼，並實際執行確認全數通過（Green）。
3. **Refactor（重構）**：在確保測試持續通過的前提下進行程式碼重構與清理。
4. **禁止未測先寫**：嚴禁跳過測試直接產生業務邏輯程式碼。
5. **UI 層級佈局、結構與動態重組驗證**：除 Domain / DTO / ViewModel 單元測試外，各平台交付前須對關鍵 UI 元件與彈窗結構進行自動化測試或實機畫面驗證（Widget / Compose UI / Snapshot 測試）：
   - **靜態結構對齊**：確認如 Bottom Sheet 貼底對齊、頂部圓角與元素間距未遭框架容器破壞。
   - **動態重組穩定性（含輸入框之彈窗必測）**：凡帶有表單輸入框的 Modal / Bottom Sheet，須在展開後模擬輸入字元觸發狀態重組（如 Compose `mainClock.autoAdvance = false` 逐幀推進），驗證彈窗容器座標維持穩定（不得重建 `SheetState`、掉回底部或重播進場動畫）。

---

## 6. 跨平台 App UI 與架構規範 (`iOS/` / `Android/` / `Flutter/`)

### 6.1 設計對齊通用規範
- **Figma 源頭腳本／MCP 逐行核對紅線（禁止僅憑摘要實作）**：撰寫任何平台 UI 元件（`AppButton`、`AppTextField`、`ToDoCellItem`、`AddTaskSheet`）或頁面（`LoginScreen`、`MainScreen`）前，**必須先直接讀取 [`FigmaDesigner/components.js`](./FigmaDesigner/components.js) 與 [`FigmaDesigner/screens/*.js`](./FigmaDesigner/screens/main.js) 原檔**（若 Figma 畫布曾手動微調，須額外透過 Figma MCP 讀取 `get_design_context` 與 `get_screenshot`），逐項 1:1 映射所有 `paddingTop/Bottom/Left/Right`、`itemSpacing`、`radius`、`stroke`、`TextStyle` 與色票變數，**嚴禁僅憑 [`README.md`](./README.md) 文字摘要推測數值或自行增刪 `Spacer`**。
- **系統容器與 Modal 修飾符紅線**：使用框架原生負責座標定位與動畫位移的容器（如 Jetpack Compose `ModalBottomSheet`、SwiftUI `.sheet`、Flutter `showModalBottomSheet`）時，**禁止在外層 `modifier` 附加會建立繪圖圖層或干擾對齊的修飾符（如 `Modifier.shadow(...)`），亦禁止在子容器重複塗底色導致圓角被覆蓋為直角**；外框形狀、底色與高度一律由容器原生參數控制（或先查證框架該版本實作順序）。
- **Bottom Sheet 高度自適應與鍵盤貼合規範（禁止固定比例 Detents 造成鍵盤大面積留白）**：`AddTaskSheet` 等含輸入框之 Bottom Sheet 容器高度必須**依內部表單實際高度自適應（Hug Content）**，彈出系統鍵盤時 Sheet 底部應**剛好貼合鍵盤上緣**向上推移：
  - **iOS (SwiftUI)**：嚴禁使用 `.presentationDetents([.medium, .large])` 固定螢幕比例高度，亦禁止在表單內容內放入撐滿全高的 `Spacer` 或 `.frame(maxHeight: .infinity)`，否則點擊輸入框喚起鍵盤時 `UISheetPresentationController` 會強制將 Sheet 升級展開至 `.large` 全螢幕高度，使操作按鈕與鍵盤上緣間產生大面積空白；必須動態量測內容實際高度（`.presentationDetents([.height(contentHeight)])`）並採自然高度排版，確保彈出鍵盤時緊湊貼合鍵盤上緣。
  - **Android / Flutter**：維持 `wrap_content` / 內容自適應高度與 `imePadding` / `viewInsets.bottom` 緊貼鍵盤上緣，不得將表單彈窗撐滿至頂部安全區域。
- **Modal State Key 與 Identity 穩定性紅線（禁止打字重組重建彈窗）**：嚴禁讓表單輸入狀態的改變直接或間接重置 Modal 容器的 State Key 或 Identity：
  - **Android (Compose)**：傳入 `rememberModalBottomSheetState`（或任何內部採 `rememberSaveable` 的狀態建立器）的 lambda（例如 `confirmValueChange`），**嚴禁直接捕獲會隨打字頻繁變動的 `uiState`**；必須先透過 `rememberUpdatedState` 讀取最新布林旗標並以 `remember { { ... } }` 鎖定 lambda 參考，避免每次輸入字元即重建 `SheetState` 導致彈窗上下跳動。
  - **iOS (SwiftUI)**：`.sheet(item: ...)` 綁定之 `Identifiable` ID 與內容 `.id(...)` 不可隨表單輸入狀態變動而銷毀重建彈窗。
  - **Flutter**：`showModalBottomSheet` 內表單控制器與狀態須與外部高頻重建隔離，禁止輸入更新時置換 Modal `Key` 或重推路由。
- **Android Google Sign-In (`Credential Manager`) 選項**：實作 Android Google 登入時須採用 `GetSignInWithGoogleOption`（而非僅依賴既有快取帳號的 `GetGoogleIdOption`），避免未預存帳號之模擬器或新裝置直接觸發 `NoCredentialException`。
- **裝置與螢幕方向強制規範（Phone Only｜Portrait & Portrait Upside Down）**：
  - **僅支援手機（Phone Only）**：三平台皆僅針對手機裝置建置與設計，不支援平板（iPad / Android Tablet）。iOS 專案須將 `TARGETED_DEVICE_FAMILY` 設為 `"1"`（僅 iPhone，禁止含 `"2"`），以免在未支援全部四方向時觸發 `All interface orientations must be supported unless the app requires full screen.` 警告。
  - **僅支援直向與倒立直向（Portrait & Portrait Upside Down）**：iOS `Info.plist` `UISupportedInterfaceOrientations` 僅設定 `UIInterfaceOrientationPortrait` 與 `UIInterfaceOrientationPortraitUpsideDown`；Android 設定 `sensorPortrait`；Flutter 設定 `SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp, DeviceOrientation.portraitDown])`。
- **Safe Area 與 WindowInsets 邊界規範**：
  - **四邊全滿版底色延伸（含動態島／挖孔周圍）**：頁面與 Modal 背景底色（`bg/canvas`、`bg/elevated`）須鋪在最外層並延伸至螢幕四邊邊緣，完整填滿狀態列、動態島、螢幕挖孔周圍與底部手勢區（iOS SwiftUI 最外層背景須使用全邊緣 `.ignoresSafeArea()`，禁止僅寫 `.vertical`；Android 須啟用 `enableEdgeToEdge()` 且將底色設於 `safeDrawingPadding()` 外層；Flutter 須將底色設於 `SafeArea` 外層如 `Scaffold.backgroundColor`）。
  - **前景內容避讓安全區域**：標題、列表與底部操作按鈕（如 `LogOut`、`AddTaskSheet` 操作列）須套用系統安全區域避讓（SwiftUI `Safe Area`、Compose `WindowInsets` / `safeDrawingPadding`、Flutter `SafeArea`），避免遭狀態列、動態島或底部 Home Indicator／導覽列遮擋。
  - **避免與 Figma 靜態頂部留白雙重疊加**：[`FigmaDesigner/screens/main.js`](./FigmaDesigner/screens/main.js) 的 `paddingTop = spacing/4xl (48)` 係供靜態畫布模擬頂部安全區域空間；實機已套用系統頂部 Safe Area / WindowInsets 時，不得再直接疊加完整 `48` 導致頂部過度留白。
- **Design Token 1:1 映射**：UI 層實作必須依據 [README.md](./README.md) 的 Code Syntax 命名（例如 `Color.bgSurface` / `colorBgSurface`、`Spacing.lg` / `spacingLg`）與 Figma Auto Layout 結構進行 1:1 映射。
- **零寫死原則**：禁止在 View / Composable / Widget 中硬編碼色碼或數值，並須自動支援 Light / Dark Mode 切換。
- **向量圖示與動畫來源**：所有靜態平台圖示需對齊 `FigmaDesigner/assets/icons/*.svg`；Loading 動畫統一使用 `shared/animations/circle-loader-*.json` 並依各自平台引入 Lottie（`lottie-ios` / `lottie-compose` / `lottie`）。

### 6.2 REST API 管理層強制選型（三平台統一規範）
當應用程式需要管理或串接 RESTful HTTP API（或未來擴充後端 / 外部 API 服務）時，三平台必須統一採用以下網路層套件，並透過 Interceptor / Plugin 自動注入 Firebase Auth ID Token（`Authorization: Bearer <ID_TOKEN>`）：
- **Android (`Android/`)**：**Retrofit**（`Retrofit` + `OkHttp` + Auth Interceptor）
- **Flutter (`Flutter/`)**：**Retrofit**（`dio` + `retrofit` + `json_annotation` + Auth Interceptor）
- **iOS (`iOS/`)**：**Moya**（以 `TargetType` 管理端點 + `PluginType` 注入驗證標頭）

### 6.3 統一分層架構強制規範（MVVM + Routing + DTO + Entity）
三平台（`Flutter/`、`Android/`、`iOS/`）必須嚴格遵守 **MVVM + Routing + DTO + Entity (+ Repository / Service)** 分層規範（完整目錄結構與資料流請對齊 [`DESIGN.md` 第 5 節](./DESIGN.md#5-各平台架構規範摘要統一採-mvvm--routing--dto--entity)）：
- **Flutter 支援平台限制**：`Flutter/` **僅支援 Android 與 iOS**（專案內僅可保留 `android/` 與 `ios/`，禁止建立或執行 `web/`、`macos/`、`windows/`、`linux/`）。
1. **Routing**：頁面跳轉與認證態導向集中於獨立 Routing 層（Flutter 採 GetX `AppPages`/`AppRoutes`、Android 採 Compose Navigation、iOS 採 Router/`NavigationStack`），禁止在 View 內硬編碼導覽邏輯。
2. **Entity & DTO**：**Entity** 僅保留純領域屬性與業務邏輯，嚴禁耦合 JSON / Firebase SDK / 框架；**DTO** 專責序列化並提供 `toEntity()` / `fromEntity()`。
3. **Repository / Service**：封裝 Firebase Auth、Cloud Firestore 與網路 API（Android / Flutter 用 **Retrofit**、iOS 用 **Moya**）。
4. **ViewModel & View**：**Flutter 使用 `GetX` 框架**（`GetxController` 擔任 ViewModel、`GetView<T>` + `Obx` 擔任 View），iOS 與 Android 使用各自 MVVM ViewModel；View 層維持純 UI 宣告，禁止直接存取 SDK 或夾帶業務邏輯，確保各層皆可透過 TDD 注入測試替身。

---

## 7. 原生應用識別碼與共用資源 (`shared/`) 同步強制規範

所有 AI 代理在處理跨平台前端建置、原生配置、動畫資源或初始化時，必須遵循以下唯一真理來源（位於 `shared/`）：
1. **唯一真理來源 (SSOT)**：
   - **Android / Flutter(Android)**：以 [shared/firebase/google-services.json](./shared/firebase/google-services.json) 中的 `package_name`（目前為 `{packageName}`）為真理來源。
   - **iOS / Flutter(iOS)**：以 [shared/firebase/GoogleService-Info.plist](./shared/firebase/GoogleService-Info.plist) 中的 `BUNDLE_ID`（目前為 `{bundleId}`）為真理來源。
   - **Lottie 動畫資產**：以 `shared/animations/circle-loader-*.json` 為唯一真理來源。
2. **對齊原則**：
   - 原生層（`build.gradle.kts`、`MainActivity.kt`、`project.pbxproj`、`Info.plist` 等）必須完全無條件對齊此真理來源，嚴禁自行宣告相異之 ID。
3. **每次平台打包／建置前必先從 `shared/` 拷貝同步（Pre-Build Sync）**：
   - **每次執行平台建置、測試或打包前**，必須先從 `shared/`（含 `shared/firebase/` 與 `shared/animations/`）**拷貝覆蓋最新檔案至對應平台目錄**（建議透過 Gradle preBuild / Xcode Build Phase / 同步腳本自動化），以免 `shared/` 更新後漏同步。
   - **嚴禁單獨修改各平台目錄內的複本**：所有憑證或動畫變更一律先改 `shared/`，再重新同步到各平台。

---

## 8. 業務程式碼零 Mock 強制規範 (No Mocks in Production Code)

所有 AI 代理在撰寫業務邏輯時，必須嚴格遵守「真實實作」原則：
1. **禁止非測試代碼包含假資料**：正式應用程式原始碼目錄（如 `Flutter/lib/`、`iOS/`、`Android/` 的正式目標）內嚴禁硬編碼任何偽造憑證（如 `demo_token`）、假身分或 Mock 資料。所有 Mock / Fake 僅允許出現在測試目錄（如 `test/`）。
2. **外部相依阻斷報告原則**：若開發過程中因缺乏第三方雲端憑證（如 Firebase / Google OAuth Client ID）或原生環境受限而無法驗證真實流程時，**嚴禁自行撰寫 Mock 假裝串通**；代理人必須立即停止並向使用者回報具體阻斷原因，請求提供金鑰或引導真實設定。
