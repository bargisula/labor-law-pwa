# Skill: labor-law-add-laws

**觸發條件**：用戶在 labor-law-pwa repo 中說下列任一指令
- 「新增法規 [法規名稱]」
- 「加法規 [法規名稱]」
- 「擴充 [法規名稱]」
- 「我需要 [法規名稱]」
- `/add-law [法規名稱]`
- 「幫我新增 [法規名稱] 到 PWA」

**功能**：查詢並抓取一部新法規，build 通過後直接 commit + push 上 GitHub。
2026-07-24 已實作 `scripts/add-laws.mjs`，不再是手動多步驟，也不再需要每次都問過才 push——
Alpha 已明確同意這個 SKILL 的標準流程就是跑到 push 為止。

**執行流程**

1. **查 PCode**：搜尋「{法規名稱} 全國法規資料庫」，從結果網址取得 `pcode=` 值
2. **查 molId 與 versionDate**：到 https://laws.mol.gov.tw 搜尋同一部法規，取得 `FLxxxxxx` 與最新版本日期（`YYYYMMDD`）
3. **執行**：
   ```bash
   node scripts/add-laws.mjs --pcode {PCode} --name {法規名稱} --molId {molId} --versionDate {YYYYMMDD} --commit --push
   ```
   這個腳本會自動：
   - 用官方鏡像驗證 pcode 對應的法規名稱是否吻合
   - 更新 `scripts/fetch-laws.mjs`（TARGETS）與 `scripts/mol-laws.manifest.json`（已存在則跳過，可重複執行）
   - 跑 `fetch-laws` → 抓函釋（`fetch-mol-law-interpretations.mjs`）→ `build-interp` → `build`
   - 任何一步失敗會直接印出錯誤並中止（exit code 非 0），不會硬撐著往下做
   - `--commit` 只加這次動到的檔案（設定檔 + `src/data/laws/` + `public/data/`），不用 `git add -A`
   - `--push` 會在 commit 成功後直接 `git push`
4. **函釋量很大時**：可以先加 `--skip-interp` 只抓條文，之後再手動補 `node scripts/fetch-mol-law-interpretations.mjs {PCode}`，並在報告說明原因
5. **push 之後網站不會自動更新**：這個 repo 的自動部署（`.github/workflows/update-laws.yml`）目前沒設定 `CLOUDFLARE_API_TOKEN` secret，所以 push 只會同步原始碼到 GitHub，不會讓網站變。想讓網站也更新，改叫另一個 SKILL：**labor-law-deploy**（見 `.github/labor-law-deploy-skill.md`）
6. **生成驗收報告** `REPORT-{PCode}.md`：條文數、函釋數（若只抓部分要說明範圍）、build 結果、是否已 push、有沒有順便部署

**預期耗時**：3-5 分鐘（含網路與 build 時間）

**使用案例**

```
用戶：我需要新增性別工作平等法到 PWA
Copilot：查 PCode/molId → node scripts/add-laws.mjs --pcode ... --commit --push
        → build 通過、已 push 上 GitHub ✅（提醒：網站需另外呼叫 deploy skill 才會更新）
```
