# Skill: labor-law-add-laws

**觸發條件**：用戶在 labor-law-pwa repo 中說下列任一指令
- 「新增法規 [法規名稱]」
- 「加法規 [法規名稱]」
- 「擴充 [法規名稱]」
- 「我需要 [法規名稱]」
- `/add-law [法規名稱]`
- 「幫我新增 [法規名稱] 到 PWA」

**功能**：完全自動化的法規擴充流程

1. **自動查詢 PCode**
   - 從全國法規資料庫（law.moj.gov.tw）查詢
   - 驗證法規名稱與 PCode 對應

2. **自動查詢 molId**
   - 從勞動部法令查詢系統（laws.mol.gov.tw）查詢
   - 取得法規版本日期

3. **自動生成法規資料**
   - 執行 `npm run add-laws` 流程
   - 更新 scripts/fetch-laws.mjs
   - 更新 scripts/mol-laws.manifest.json
   - 抓取條文（fetch-laws）
   - 抓取函釋（fetch-interp-law）
   - 完整構建（build）

4. **自動提交與部署**
   - git commit & push
   - 提交訊息格式：「feat: 新增 [法規名稱] ([PCode])」
   - GitHub Actions 自動部署到 Cloudflare Pages

5. **生成驗收報告**
   - 產出 REPORT-[PCODE].md
   - 列出條文數、函釋數、構建狀態
   - 提供 PWA 訪問 URL

**預期耗時**：3-5 分鐘（含網絡時間）

**使用案例**：

```
用戶：我需要新增性別工作平等法到 PWA
Copilot：自動查詢 → 自動生成 → 自動部署 ✅

用戶：擴充勞保條例
Copilot：自動查詢 → 自動生成 → 自動部署 ✅
```

**實裝詳情**：見 `scripts/add-laws.mjs` 與 `PITFALLS-AND-IMPROVEMENTS.md`
