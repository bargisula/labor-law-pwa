# Copilot CLI Guidance（代號 Lucius）

## 🚀 SKILL：labor-law-add-laws（新增勞動法規）

觸發方式：在 labor-law-pwa repo 中說以下任一指令
- 「新增法規 [法規名稱]」
- 「加法規 [法規名稱]」
- 「擴充 [法規名稱]」
- 「我需要 [法規名稱]」
- `/add-law [法規名稱]`

**執行流程**
1. 查 PCode（全國法規資料庫）、molId（勞動部法令查詢系統）
2. 手動編輯 `scripts/fetch-laws.mjs` 的 TARGETS 與 `scripts/mol-laws.manifest.json`（沒有自動化腳本，這兩步是編輯設定檔）
3. 依序跑 `npm run fetch-laws` → `node scripts/fetch-mol-law-interpretations.mjs {PCode}` → `npm run build-interp` → `npm run build`
4. git commit（只加這次動到的檔案）
5. **push 前先問 Alpha 或 Claude，等同意才 push。** push 後網站會不會更新，取決於 repo 是否設定 `CLOUDFLARE_API_TOKEN`（見 README「自動部署」章節）——沒設定就只是同步原始碼，網站不會變，回報時要講清楚
6. 生成 `REPORT-{PCode}.md`：條文數、函釋數、build 結果、是否已 push、部署是否會生效

**預期耗時**：抓取 + build 約 3-5 分鐘；push/部署另外等確認。

**文檔**：見 `.github/labor-law-add-skill.md` 與 `PITFALLS-AND-IMPROVEMENTS.md`

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
