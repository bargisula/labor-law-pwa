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
2. **勞動部勞動法令查詢系統**（laws.mol.gov.tw）— 解釋令函（Phase 2，來源待驗證）

資料僅供參考，以官方公告為準。頁面須標示資料更新日期與官方來源連結。

## 開發階段

- [x] **Phase 1 — MVP**（2026-07-02 完成開發，待部署）
  - [x] 驗證資料來源（官方需申請 → 改用社群鏡像，見上）
  - [x] 資料轉換腳本 `scripts/fetch-laws.mjs`（3 部法規、181 條）
  - [x] Astro 建站：法規列表、條文頁（章節+錨點）、關鍵字搜尋
    - 中文搜尋：MiniSearch + 2-gram；精準比對找不到時自動放寬（「特休」→「特別休假」可命中）
  - [x] PWA：manifest + Service Worker 離線快取（已驗證註冊成功，全站預快取約 228 KiB）
  - [x] GitHub Actions 每週自動更新法規資料（`.github/workflows/update-laws.yml`）
  - [ ] 部署 Cloudflare Pages（需帳號，見下方部署步驟）
- [ ] **Phase 2 — 函釋整合**
  - [ ] 驗證勞動部函釋資料來源（API 或爬蟲）
  - [ ] 函釋與條文關聯（每條列出相關函釋）
  - [ ] 搜尋範圍納入函釋
- [ ] **Phase 3 — 進階（可選）**
  - [ ] 擴充相關法規（職安法、勞退條例、性平法…）
  - [ ] 情境入口（加班費、特休…）與試算器
  - [ ] AI 問答（需 API 費用，最後評估）

## 專案結構

```
labor-law-pwa/
├── scripts/            # 資料抓取與轉換腳本
│   └── fetch-laws.mjs  # 下載官方開放資料 → public/data/*.json
├── public/data/        # 轉換後的法規 JSON（隨網站發布）
├── src/
│   ├── pages/          # Astro 頁面
│   └── components/     # UI 元件
└── README.md
```

## 常用指令

```bash
npm install          # 安裝依賴
npm run fetch-laws   # 更新法規資料
npm run dev          # 本機開發
npm run build        # 建置靜態網站
```

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
