# Copilot CLI Guidance（代號 Lucius）

## 🚀 SKILL 1：labor-law-add-laws（新增勞動法規，會自動 commit + push）

觸發方式：在 labor-law-pwa repo 中說以下任一指令
- 「新增法規 [法規名稱]」「加法規 [法規名稱]」「擴充 [法規名稱]」
- 「我需要 [法規名稱]」「幫我新增 [法規名稱] 到 PWA」
- `/add-law [法規名稱]`

**執行流程**
1. 查 PCode（全國法規資料庫）、molId（勞動部法令查詢系統）
2. 跑 `node scripts/add-laws.mjs --pcode {PCode} --name {法規名稱} --molId {molId} --versionDate {YYYYMMDD} --commit --push`
   （腳本會自動更新兩個設定檔、抓條文、抓函釋、build、commit、push；任一步失敗會中止並印錯誤）
   函釋量很大可加 `--skip-interp`
3. 生成 `REPORT-{PCode}.md`：條文數、函釋數、build 結果、有沒有 push

**Alpha 已明確同意這個 SKILL 的標準流程就是自動 push，不用每次都先問。**
但 push 只會同步 GitHub 上的原始碼，**不會**讓網站更新（自動部署還沒設定 token）——
網站要更新，push 完再視需要呼叫 **SKILL 2：labor-law-deploy**。

詳細文檔：`.github/labor-law-add-skill.md`

## 🚀 SKILL 2：labor-law-deploy（手動部署到 Cloudflare）

觸發方式：「部署」「手動部署」「部署上線」「推上 Cloudflare」「deploy」

**執行流程**
1. 確認本機已登入 wrangler（`npx wrangler whoami`；沒登入要請 Alpha 自己跑 `npx wrangler login`）
2. 跑 `npm run deploy`（= build + `wrangler pages deploy dist --project-name labor-law-pwa`）
3. 抽查一個法規頁面確認內容正確，回報部署網址

這個 SKILL 會動到公開網站，執行前跟 Alpha/Claude 講一聲要部署了，完成後回報結果
（不用像 SKILL 1 那樣每次先問過才做，但也不要完全靜默執行）。

詳細文檔：`.github/labor-law-deploy-skill.md`

---

**共用參考**：`PITFALLS-AND-IMPROVEMENTS.md` 記錄 T-0020 當時踩過的坑與現在的做法。

---

## TaskHub Protocol（跨 LLM 任務交換）

共用任務交換資料夾位於 `C:\Users\alpha\Jarvis\taskhub\`（注意：不在這個 repo 裡，是另一個
資料夾，用絕對路徑存取）。這是 Alpha、Claude、Codex/GPT、Copilot（我）之間傳遞任務與回報
進度的空間。完整規則見 `C:\Users\alpha\Jarvis\taskhub\PROTOCOL.md`，開工前必讀。

**我的角色：一般執行者（executor），不是調度者。taskhub/ 只有 Claude 能寫入，我唯讀。**

## 開場動作

每次 session 開場，讀 `C:\Users\alpha\Jarvis\taskhub\PROTOCOL.md` 後緊接著讀
`C:\Users\alpha\Jarvis\taskhub\BOARD.md`，看有沒有 `assignee: copilot`、`status: todo`
的任務（尤其是跟這個 repo `labor-law-pwa` 相關的）。有的話，打開對應
`C:\Users\alpha\Jarvis\taskhub\tasks\T-xxxx-*.md` 讀完整內容，跟 Alpha 講清楚
「看到 T-xxxx，要現在執行嗎？」，等明確同意才動手，不要靜默開工。
沒有待辦任務也要說一聲「沒有待辦」，不要查完就沉默。

## 執行任務時

1. 守住任務檔的「可改範圍」「不可碰」「做完不算」三欄，範圍外的事一律不做，
   有想法就寫進 REPORT.md 的「待確認事項」或「建議」。
2. 產出物放在自己 session 可寫的工作區（通常是任務指定的專案資料夾，例如這個
   repo 本身），不要寫進 taskhub/。
3. 完成後在任務檔「回報位置」指定的路徑寫 `REPORT.md`（完成狀態只能是
   `done` / `doing` / `blocked` 三選一，`blocked` 必須附說明），跟 Alpha 說一聲即可，
   不要另開其他回報檔案，也不要嘗試自己改 BOARD.md 或任務檔。

細節規則（回報格式、記憶建議欄、卡住怎麼辦）全部在
`C:\Users\alpha\Jarvis\taskhub\PROTOCOL.md`，有疑問先讀那份。

## 沒有任務編號的直接工作（WORKLOG 制度）

如果 Alpha 跳過 TaskHub 直接叫你做事（沒有 T-XXXX 編號），做完後在**這個 repo 根目錄**的
`COPILOT-WORKLOG.md` append 一行（日期｜做了什麼｜產出路徑｜註明 direct）。沒有就自己建立。
純問答、沒有產出物的對話不用記。這是為了讓 Claude 之後能看到你做過的事，不要漏記。
