# 勞基法查詢 PWA（labor-law-pwa）

> 建立日期：2026-07-02
> 最後更新：2026-07-02

用手機查詢**勞動基準法條文與相關解釋（函釋）**的網頁 App。

## 專案目標

1. 手機上快速查詢勞基法條文（全文搜尋）
2. 查詢勞動部相關解釋令函（函釋）
3. PWA：可加入手機主畫面、離線可用
4. 零成本：純靜態網站，不需要後端伺服器與資料庫

## 為什麼不需要後端/資料庫（2026-07-02 決策）

- 法規資料是唯讀的，使用者只查不寫
- 勞基法 + 施行細則 + 函釋總量僅幾 MB，打包成靜態 JSON 隨網站發布
- 全文搜尋用 MiniSearch 在瀏覽器端執行（毫秒級）
- 資料更新靠 GitHub Actions 排程重抓 + 重新 build，不需要常駐伺服器
- 例外：日後若做 AI 問答或跨裝置同步收藏，才需要後端

## 技術棧

| 項目 | 選擇 | 理由 |
|---|---|---|
| 前端框架 | Astro | 靜態輸出、維護者已有經驗 |
| PWA | @vite-pwa/astro | 自動生成 Service Worker + manifest |
| 搜尋 | MiniSearch（前端） | 中文用 2-gram 斷詞索引 |
| 資料管線 | Node 腳本 + GitHub Actions | 定期抓取官方開放資料 |
| 託管 | Cloudflare Pages（或 GitHub Pages） | 免費、HTTPS（PWA 必要） |

## 資料來源

1. **全國法規資料庫**（law.moj.gov.tw）— 2026-07-02 驗證：官方整包開放資料需申請帳號，
   故改用社群鏡像 [kong0107/mojLawSplitJSON](https://github.com/kong0107/mojLawSplitJSON)
   （定期同步官方整包，驗證時最後更新 2026-06-26）。日後可申請官方授權後換回官方端點。
   - 目前收錄：勞動基準法（N0030001）、施行細則（N0030002）、勞工請假規則（N0030006）
   - 新增法規：在 `scripts/fetch-laws.mjs` 的 `TARGETS` 加 PCode 即可
2. **勞動部勞動法令查詢系統**（laws.mol.gov.tw）— 解釋令函，由 Codex 依 schema 抓取後放入 `raw/interpretations/`（流程見下方 SOP）

資料僅供參考，以官方公告為準。頁面須標示資料更新日期與官方來源連結。

## 開發階段

- [x] **Phase 1 — MVP**（2026-07-02 完成並上線）
  - [x] 驗證資料來源（官方需申請 → 改用社群鏡像，見上）
  - [x] 資料轉換腳本 `scripts/fetch-laws.mjs`（3 部法規、181 條）
  - [x] Astro 建站：法規列表、條文頁（章節+錨點）、關鍵字搜尋
    - 中文搜尋：MiniSearch + 2-gram；精準比對找不到時自動放寬（「特休」→「特別休假」可命中）
  - [x] PWA：manifest + Service Worker 離線快取（已驗證註冊成功，全站預快取約 228 KiB）
  - [x] GitHub Actions 每週自動更新法規資料（`.github/workflows/update-laws.yml`）
  - [x] 部署 Cloudflare Pages：https://labor-law-pwa.pages.dev（2026-07-02）
- [x] **Phase 2 — 函釋整合**（2026-07-02 上線第一批：第 39 條 47 則）
  - [x] 資料來源：勞動部勞動法令查詢系統，由 Codex 抓取存 `raw/interpretations/`（schema 見下）
  - [x] 函釋與條文關聯：條文卡片下方顯示「📖 相關函釋 N 則」連結
  - [x] 函釋頁 `/interp/<pcode>/<條號>/`：摺疊卡片（要旨→全文），已廢止標紅排最後
  - [x] 搜尋納入函釋「要旨」（全文不進索引，控制離線快取體積）
  - [ ] 陸續補其他條文的函釋（提供 Codex 抓取 → 丟 raw → 跑指令，見下方 SOP）
- [ ] **Phase 3 — 進階**
  - [x] 情境入口頁（2026-07-02 上線 9 個情境）
    - 對照表在 `src/data/scenarios.json`（人工策展）；新增/修改情境直接編輯此檔
    - **正確性機制**：refs 引用的條號在 build 時比對法規資料，不存在即 build 失敗；
      頁面顯示條文官方原文，白話導讀僅作輔助並標示「以條文原文為準」
    - 情境標題+關鍵詞+導讀進搜尋索引（口語如「被裁員」可直達情境頁）
  - [ ] 試算器（加班費、特休天數、資遣費）
  - [ ] 擴充相關法規（職安法、勞退條例、性平法…）
  - [ ] AI 問答（需 API 費用，最後評估）

## 專案結構

```
labor-law-pwa/
├── raw/interpretations/      # 函釋原始檔（手動/Codex 放入，進 git）
│   └── N0030001-39.json      #   檔名規範：<法規代號>-<條號>.json
├── scripts/
│   ├── fetch-laws.mjs        # 下載法規開放資料 → src/data/laws/
│   ├── build-interpretations.mjs  # raw 函釋 → src/data/interp/（清洗+驗證）
│   └── build-search.mjs      # 條文+函釋要旨 → public/data/search.json
├── src/data/laws/            # 生成：法規條文（勿手動改）
├── src/data/interp/          # 生成：函釋（勿手動改）
├── public/data/              # 生成：搜尋索引（勿手動改）
└── src/pages/                # Astro 頁面
    ├── index.astro           # 首頁+搜尋
    ├── laws/[pcode].astro    # 法規全文頁
    └── interp/[pcode]/[article].astro  # 函釋頁
```

## 常用指令

```bash
npm install           # 安裝依賴
npm run fetch-laws    # 更新法規資料（含重建搜尋索引）
npm run build-interp  # 函釋 raw 檔異動後重建（含重建搜尋索引）
npm run dev           # 本機開發
npm run build         # 建置靜態網站
npx wrangler pages deploy dist --project-name labor-law-pwa   # 手動部署
```

## 函釋資料：如何增加/刪除（SOP）

**新增某條的函釋（優先用現成爬蟲）：**
1. 跑 Codex 寫的爬蟲（參數：勞動部法規 ID、條號、法規版本日期、輸出路徑）：
   ```bash
   node scripts/fetch-mol-article-interpretations.mjs FL014930 24 20240731 raw/interpretations/N0030001-24.json
   ```
   （FL014930 = 勞動基準法在勞動部系統的 ID；其他法規 ID 到 laws.mol.gov.tw 查）
   爬蟲失效時退回請 Codex 手動抓，輸出下述 schema 存同樣位置
2. 跑 `npm run build-interp && npm run build`，確認 console 顯示該條則數
3. commit + push（有設 CI token 就自動部署；否則手動跑上面的 deploy 指令）

**刪除**：刪掉對應的 raw 檔，重跑步驟 3-4（輸出區每次全量重建，不會殘留）。
**更新**：直接覆蓋 raw 檔，重跑步驟 3-4。

**raw 檔 schema（schemaVersion 1）必填欄位：**
```jsonc
{
  "schemaVersion": 1,
  "fetchedAt": "ISO 日期",
  "law": { "name": "勞動基準法", "articleNo": "39", "interpretationsUrl": "官方查詢網址" },
  "interpretations": [
    {
      "recordNo": 1,             // 序號
      "issuingAgency": "勞動部",  // 發文機關
      "documentNo": "…號函",      // 發文字號（必填）
      "date": "民國 108 年…",     // 發文日期
      "gist": "要旨…",            // 必填，進搜尋索引
      "fullText": "全文…",        // 選填（部分早期函釋官方僅有要旨），函釋頁顯示
      "relatedArticles": "…",     // 相關法條（選填）
      "isRepealed": false,        // 已廢止標記
      "sourceUrl": "官方原文網址"
    }
  ]
}
```
轉換腳本會驗證必填欄位，缺欄位會直接報錯並指出第幾筆。

## 部署（Cloudflare Pages，免費）

- **正式網址：https://labor-law-pwa.pages.dev**（2026-07-02 首次部署）
- GitHub repo：https://github.com/bargisula/labor-law-pwa
- 部署方式：wrangler 直接上傳（`npx wrangler pages deploy dist --project-name labor-law-pwa`）
- 手機使用：瀏覽器開啟網址 → 選單「加入主畫面」即可當 App 用

### 自動部署（尚待完成一步）

GitHub Actions 已設定：每週更新法規、每次 push 後自動建置部署。
但需要在 GitHub repo 加一個 secret 才會生效（沒加時部署步驟自動跳過，網站維持舊版）：

1. Cloudflare Dashboard → 右上頭像 → My Profile → **API Tokens** → Create Token
   → 用「**Edit Cloudflare Workers**」模板或自訂：權限 **Cloudflare Pages: Edit**
2. GitHub repo → Settings → Secrets and variables → Actions → New repository secret
   - 名稱：`CLOUDFLARE_API_TOKEN`、值：剛才產生的 token

## 需求變更紀錄

| 日期 | 變更 |
|---|---|
| 2026-07-02 | 專案建立。確認需求：勞基法+函釋查詢、PWA、免費託管、無後端 |
| 2026-07-02 | Phase 2 上線：函釋子系統（raw→清洗→頁面→搜尋），第一批為第 39 條 47 則 |
| 2026-07-02 | 情境入口頁上線（9 情境）；Codex 補第 24 條（64 則）、第 36 條（63 則）函釋 |
