# Skill: labor-law-add-laws

**觸發條件**：用戶在 labor-law-pwa repo 中說下列任一指令
- 「新增法規 [法規名稱]」
- 「加法規 [法規名稱]」
- 「擴充 [法規名稱]」
- 「我需要 [法規名稱]」
- `/add-law [法規名稱]`
- 「幫我新增 [法規名稱] 到 PWA」

**功能**：法規擴充流程。以下每一步都是專案裡實際存在的指令，沒有虛構步驟。

1. **查詢 PCode**
   - 搜尋「{法規名稱} 全國法規資料庫」，從搜尋結果網址取得 `pcode=` 值
   - 或直接開 `https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode={猜測值}` 驗證法規名稱是否對得上

2. **查詢 molId 與 versionDate**
   - 到 https://laws.mol.gov.tw 搜尋同一部法規，取得法規 ID（`FLxxxxxx`）與最新版本日期（`versionDate`，格式 `YYYYMMDD`）

3. **編輯兩個設定檔**（手動編輯，沒有自動化腳本）
   - `scripts/fetch-laws.mjs` 的 `TARGETS` 陣列加一行 `'{PCode}', // {法規名稱}`
   - `scripts/mol-laws.manifest.json` 加一筆 `"{PCode}": { "name": "...", "molId": "...", "versionDate": "..." }`

4. **執行既有 npm 指令**（依序執行，任一步失敗就停下回報，不要跳過）
   ```bash
   npm run fetch-laws                                    # 抓條文 + 更新搜尋索引
   node scripts/fetch-mol-law-interpretations.mjs {PCode} # 抓函釋（可能耗時較久，量大時可先用 --articles= 篩範圍，並在報告說明涵蓋範圍）
   npm run build-interp                                  # 整合函釋索引
   npm run build                                         # 完整 build，確認無報錯
   ```

5. **commit（push 與部署需要人確認，見下方）**
   - `git add` 只加這次動到的檔案（設定檔 + `src/data/laws/` + `public/data/` 產出檔），不要 `git add -A`
   - commit message 格式：「feat: 新增 [法規名稱] ([PCode])」

6. **⚠️ push 與部署：先問，不要自動做**
   - **不要自己 `git push`。** commit 完先跟 Alpha 或 Claude 說「已生成並 build 通過，要不要現在 push？」，等明確同意才 push。
   - push 之後會不會真的部署到 Cloudflare，取決於 repo 有沒有設定 `CLOUDFLARE_API_TOKEN` secret（見 `README.md` 的「自動部署」章節）。沒設定的話 push 只會更新 GitHub 上的原始碼，網站不會變，這不是失敗，是預期行為，回報時要講清楚這一點。

7. **生成驗收報告**
   - 產出 `REPORT-{PCode}.md`，列出條文數、函釋數（若只抓部分條文要說明範圍與原因）、build 結果
   - 說明目前是否已 push、Cloudflare secret 是否存在（影響網站會不會更新）

**預期耗時**：抓取 + build 約 3-5 分鐘；push/部署另外等人確認，不算在這個時間內。

**使用案例**：

```
用戶：我需要新增性別工作平等法到 PWA
Copilot：查 PCode/molId → 編輯設定檔 → 跑 fetch/build → commit →
        「build 通過，要 push 嗎？」→ 等確認
```
