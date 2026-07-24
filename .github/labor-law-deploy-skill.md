# Skill: labor-law-deploy

**觸發條件**：用戶在 labor-law-pwa repo 中說下列任一指令
- 「部署」「手動部署」「部署上線」
- 「推上 Cloudflare」「deploy」
- 「網站什麼時候會更新」→ 先解釋原因（見下），問要不要現在手動部署

**背景**：這個 repo 的自動部署（`.github/workflows/update-laws.yml`，push 到 main 時觸發）
需要 GitHub repo 設定 `CLOUDFLARE_API_TOKEN` secret 才會真的執行 `wrangler pages deploy`；
沒設定時該 step 會被跳過（`skipped`），網站不會變。截至 2026-07-24 這個 secret **還沒設定**，
所以目前每次要讓網站真的更新，都要靠這個 SKILL 手動部署。

**前提**：本機要有 Cloudflare 帳號的 wrangler 登入（跑 `npx wrangler whoami` 確認）。
- 如果顯示帳號資訊（例如 `bargisula@gmail.com`）→ 可以直接部署
- 如果要求登入 → 先跑 `npx wrangler login`（會開瀏覽器讓 Alpha 本人授權，這一步不能代勞）

**執行流程**

```bash
npm run deploy
```
（等同 `npm run build && npx wrangler pages deploy dist --project-name labor-law-pwa`）

- build 會把 `src/data/laws/`、`public/data/` 目前的內容一起打包，所以只要資料已經在本機
  （不管有沒有 push 上 GitHub）都會被部署上去
- 部署完成後 wrangler 會印出正式網址 `https://labor-law-pwa.pages.dev` 與這次部署的專屬網址
  （例如 `https://xxxxxxxx.labor-law-pwa.pages.dev`）
- 部署完抽查一個新增/異動過的法規頁面（例如 `https://labor-law-pwa.pages.dev/laws/{PCode}/`），
  確認條文與最新異動日期正確，再回報給 Alpha

**跟 labor-law-add-laws 的關係**：兩個 SKILL 是分開的。`add-laws` 負責抓資料 + commit + push
到 GitHub；這個 SKILL 只管把**目前本機的 build 結果**推上 Cloudflare。通常順序是先跑
`add-laws`，跑完再視需要呼叫這個 SKILL 讓網站同步更新。

**注意事項**
- 這個 SKILL 會動到正式網站（公開網址），跟 `add-laws` 的 git push 不一樣層級，
  執行前照一般約定跟 Alpha 或 Claude 講一聲要部署了、部署完回報結果，不要靜默執行
- 不要自己去改 GitHub repo 的 secret 設定（那是帳號層級的變更，需要 Alpha 自己在
  Cloudflare/GitHub 網頁上操作）
