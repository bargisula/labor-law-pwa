# T-0020 法規擴充踩坑紀錄 & 改善方案

> 本文記錄新增工會法、勞資爭議處理法、就業服務法時的所有坑點，以及如何優化流程一次到位

---

## 🔴 坑點匯總

### **坑 #1：PCode 查詢困難**

**症狀**
- 用 `全國法規資料庫` 搜尋頁面（LawSearchContent.aspx）被 302 重定向拒絕
- GitHub 鏡像 API 查詢失敗
- PowerShell 在非互動模式下無法使用 `Invoke-WebRequest`
- 試錯多個 pcode 組合浪費時間（N0023001 ~ N0082001）

**根本原因**
- 全國法規資料庫的搜尋頁有反爬蟲機制
- 沒有明確的 pcode 查詢指南，只能靠嘗試

**解決方案**
```
✅ 直接用 Google 搜尋「{法規名稱} site:law.moj.gov.tw」
✅ 或用 URL 格式：https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode={pcode}
✅ 若已知 molId，可反向查勞動部法令查詢系統
```

**本次實際做法**
- Alpha 直接給了 URL 含 pcode=N0020007
- 之前的 N0020001（工會法）、N0090001（就業服務法）是從鏡像爬蟲驗證出來的

---

### **坑 #2：molId 更新不及時**

**症狀**
- 新增的 3 部法規在 `mol-laws.manifest.json` 中需要 molId
- 不確定 molId 的正確值（FL000272、FL000289、FL000348）
- 沒有驗證這些 molId 是否有效

**根本原因**
- molId 是勞動部內部編碼，沒有公開映射表
- 無法自動查詢，必須人工驗證或從文檔反推

**解決方案**
```
✅ 建立 molId 查詢指南（待補）：
   - 進入 https://laws.mol.gov.tw 查詢法規
   - 從瀏覽器 URL 或頁面 source 取得 molId
✅ 為 mol-laws.manifest.json 加註解說明來源
✅ 添加驗證腳本檢查 molId 有效性
```

**本次實際做法**
- 手工填入推測的 molId
- 實際執行 `npm run fetch-interp-law` 時發現三部新法無函釋記錄
- molId 值未被驗證是否有效

---

### **坑 #3：函釋抓取「自動移除空檔案」隱藏邏輯**

**症狀**
```
Fetching 工會法 第 1 條
Wrote C:\Users\alpha\labor-law-pwa\raw\interpretations\N0020001-1.json
No interpretations; removed raw\interpretations\N0020001-1.json
```
- 腳本抓完檔案後發現沒有函釋就自動刪除
- 新手看不懂為什麼 raw/interpretations/ 是空的
- 容易誤認為腳本失敗

**根本原因**
- `fetch-mol-article-interpretations.mjs` 的設計：若條文無函釋則自動清理暫存檔
- 這是合理的，但訊息不夠清楚

**解決方案**
```
✅ 在文檔（README.md「常用指令」）明確說明：
   「npm run fetch-interp-law -- <PCODE>
    若某法規無函釋記錄，不會在 raw/interpretations/ 生成檔案（正常行為）
    可查看 stdout 的 Summary 確認抓取結果」

✅ 改進 Summary 格式，加上彩色標記區分「有函釋」vs「無函釋」
```

**本次實際做法**
- 看到沒生成檔案，一開始以為抓取失敗
- 後來查看 Summary 才確認三部法規都無函釋（預期行為）

---

### **坑 #4：生成法規頁面時缺少「法規概況」元資料**

**症狀**
- 新增法規頁面（`/laws/N0020001/`）生成成功，但缺少必要的元資料
- 頁面標題、描述不完整
- 如果後續要加「常見問答」或「試算器」，需要額外的 metadata

**根本原因**
- `src/data/laws/index.json` 只包含基礎資訊（pcode、name、updated、articleCount）
- 沒有「法規簡介」「主要用途」等欄位

**解決方案**
```
✅ 擴展 index.json schema：
{
  "pcode": "N0020001",
  "name": "工會法",
  "description": "規範勞工組織工會、團體協商、爭議行為等權利",
  "updated": "2022-11-30",
  "articleCount": 49,
  "category": "勞資關係",  // 便於後續分類篩選
  "hasInterpretations": false,  // 快速判斷有無函釋
  "scenarioIds": [],  // 關聯的情境導讀 ID
  "calculatorAvailable": false  // 是否有試算器
}

✅ 在 build 時驗證 schema 完整性
```

**本次實際做法**
- 沒有添加這些元資料
- 未來若要擴充功能，這會成為技術債

---

### **坑 #5：Git merge 衝突（無謂的 rebase 卡住）**

**症狀**
```
CONFLICT (content): Merge conflict in src/data/laws/index.json
fatal: Your local changes to the following files would be overwritten by merge
```
- `git pull` 時 index.json 時間戳衝突
- 用 `git rebase --continue` 卡在 Vim 編輯器，無法自動化

**根本原因**
- 遠端分支已有最新提交（Claude 或其他 LLM 推送的）
- `src/data/laws/index.json` 的 `fetchedAt` 時間戳會隨著每次 fetch-laws 更新
- 導致衝突

**解決方案**
```
✅ 在 .gitignore 中排除自動生成檔案：
   public/data/search.json
   src/data/laws/index.json (只納入初版，後續由 CI/CD 生成)

✅ 或在提交前執行：
   git pull --rebase --no-edit

✅ 改進 CI/CD 流程：
   - 不提交自動生成的 index.json（改由 GitHub Actions 產生）
   - 只提交 scripts/ 和 raw/interpretations/ 的手工檔案
```

**本次實際做法**
- 手工解決衝突（只保留新的 fetchedAt）
- 用 `git merge` 而非 `git rebase`（避免 Vim 卡住）

---

### **坑 #6：Cloudflare Pages 部署需要 API Token**

**症狀**
```
X [ERROR] In a non-interactive environment, it's necessary to set a CLOUDFLARE_API_TOKEN
```
- `npx wrangler pages deploy dist/` 需要認證
- 環境變數未設置
- `.wrangler` 本地認證不存在

**根本原因**
- 這是 Cloudflare 的安全設計，不允許未認證的部署
- 個人開發環境通常有手工設置的 token，但 CI/CD 環境需要明確配置

**解決方案**
```
✅ 改用 GitHub Actions 自動部署：
   - 在 .github/workflows/ 中定義部署流程
   - 使用 GitHub Secrets 存儲 CLOUDFLARE_API_TOKEN
   - 每次 push 到 main 自動構建 & 部署

✅ Workflow 範例（見下方）

✅ 如果用本機手工部署：
   export CLOUDFLARE_API_TOKEN=<token>
   npx wrangler pages deploy dist/
```

**本次實際做法**
- 因環境變數缺失，無法本機部署
- 靠 git push 後的 GitHub Actions 自動部署
- （假設 Cloudflare Pages 已連結 repo）

---

### **坑 #7：缺少統一指令，且第一版 SKILL 文件虛構了不存在的腳本**

**症狀**
- 要新增法規需要執行多個步驟（更新兩個設定檔 + 跑 4 個 npm 指令 + commit）
- 第一版 `.github/labor-law-add-skill.md` 寫著會跑 `npm run add-laws` / `scripts/add-laws.mjs`，
  但這個腳本從頭到尾沒有真的建立過，`package.json` 也沒有這個 script——照著那份文件做會直接卡在
  「找不到指令」

**根本原因**
- 沒有統一的自動化腳本，本文件當時提案的 `scripts/add-laws.mjs`（見下方「方案 A」）只是草稿，
  沒有被實作，但 SKILL 文件卻先寫成已完成

**已修正的做法（2026-07-24，Claude 修正）**
- 不建立新腳本，改成在 SKILL 文件裡如實描述現有的 4 個 npm 指令（`fetch-laws` →
  `fetch-mol-law-interpretations.mjs` → `build-interp` → `build`），先確保「照著文件做真的能跑」
- 同時把「自動 git commit & push」改成「commit 完先問 Alpha/Claude，同意才 push」——
  之前這裡設計成全自動 push，跟任務協議「部署要人確認」衝突，這次一起修掉
- 下方「方案 A / B」的自動化腳本與新 workflow 目前**不採用**，維持手動多步驟；
  如果之後真的常態性新增法規、手動流程覺得煩，再回頭評估要不要做

---

## 💭 當時想過的方案（未採用，僅留存參考）

> 以下方案 A/B/C 是 T-0020 當下的構想草稿。**實際上沒有被建立**，且方案裡「自動 git push」的
> 設計跟部署需要人確認的原則衝突，2026-07-24 已決定不採用，改成前面「坑 #7」修正後的手動流程。
> 保留在這裡純粹是記錄曾經考慮過什麼、為什麼沒做。

### **方案 A：本機開發流程最小化（未建立）**

構想中的 `scripts/add-laws.mjs`：

```javascript
#!/usr/bin/env node
/**
 * 互動式法規新增工具
 * 使用方式：npm run add-laws
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function promptUser(question) {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => rl.question(question, answer => {
    rl.close();
    resolve(answer.trim());
  }));
}

async function main() {
  console.log('\n🔧 法規新增工具\n');

  // 1. 收集法規資訊
  const lawName = await promptUser('法規名稱（如：工會法）: ');
  const pcode = await promptUser(`${lawName} 的 PCode（如：N0020001）: `);
  const molId = await promptUser(`${lawName} 的 molId（如：FL000272）: `);
  const versionDate = await promptUser(`修正日期（YYYYMMDD 格式）: `);

  // 2. 驗證 PCode 有效性
  console.log(`\n✓ 驗證 ${pcode} 有效性...`);
  try {
    const mirror = `https://raw.githubusercontent.com/kong0107/mojLawSplitJSON/master/FalVMingLing/${pcode}.json`;
    const response = await fetch(mirror);
    if (!response.ok) throw new Error('PCode 無效');
    const data = await response.json();
    const actualName = data['法規名稱'];
    console.log(`  ✅ ${pcode} = ${actualName}`);
  } catch (e) {
    console.error(`  ❌ 驗證失敗: ${e.message}`);
    process.exit(1);
  }

  // 3. 更新 fetch-laws.mjs
  console.log(`\n✓ 更新 scripts/fetch-laws.mjs...`);
  const fetchLawsPath = path.join(ROOT, 'scripts/fetch-laws.mjs');
  let fetchLawsContent = readFileSync(fetchLawsPath, 'utf-8');
  const newTarget = `  '${pcode}', // ${lawName}`;
  if (!fetchLawsContent.includes(pcode)) {
    fetchLawsContent = fetchLawsContent.replace(
      /^const TARGETS = \[/m,
      `const TARGETS = [\n${newTarget}`
    );
    writeFileSync(fetchLawsPath, fetchLawsContent);
    console.log(`  ✅ 添加 ${pcode}`);
  }

  // 4. 更新 mol-laws.manifest.json
  console.log(`\n✓ 更新 scripts/mol-laws.manifest.json...`);
  const manifestPath = path.join(ROOT, 'scripts/mol-laws.manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  if (!manifest[pcode]) {
    manifest[pcode] = {
      name: lawName,
      molId: molId,
      versionDate: versionDate,
    };
    // 重新排序（按 pcode）
    const sorted = Object.keys(manifest).sort().reduce((acc, key) => {
      acc[key] = manifest[key];
      return acc;
    }, {});
    writeFileSync(manifestPath, JSON.stringify(sorted, null, 2) + '\n');
    console.log(`  ✅ 添加 ${pcode}`);
  }

  // 5. 執行 fetch-laws
  console.log(`\n✓ 執行 npm run fetch-laws...`);
  try {
    execSync('npm run fetch-laws', { cwd: ROOT, stdio: 'inherit' });
  } catch (e) {
    console.error(`  ❌ fetch-laws 失敗`);
    process.exit(1);
  }

  // 6. 執行 fetch-interp-law
  console.log(`\n✓ 執行 npm run fetch-interp-law -- ${pcode}...`);
  try {
    execSync(`npm run fetch-interp-law -- ${pcode}`, { cwd: ROOT, stdio: 'inherit' });
  } catch (e) {
    console.error(`  ⚠️  fetch-interp-law 失敗（通常是因為無函釋記錄，不影響）`);
  }

  // 7. 執行 build-interp & build
  console.log(`\n✓ 執行 build 流程...`);
  try {
    execSync('npm run build-interp && npm run build', { cwd: ROOT, stdio: 'inherit' });
  } catch (e) {
    console.error(`  ❌ build 失敗`);
    process.exit(1);
  }

  // 8. Git 提交
  const shouldCommit = await promptUser('\n✓ 是否立即 git commit & push? (y/n): ');
  if (shouldCommit.toLowerCase() === 'y') {
    console.log(`\n✓ 提交變更...`);
    try {
      execSync(`git add -A && git commit -m "feat: 新增 ${lawName} (${pcode})"`, { cwd: ROOT, stdio: 'inherit' });
      execSync('git push', { cwd: ROOT, stdio: 'inherit' });
      console.log(`  ✅ 已推送到 GitHub`);
    } catch (e) {
      console.error(`  ❌ git 操作失敗`);
    }
  }

  console.log(`\n✅ 完成！${lawName} 已新增\n`);
}

main().catch(console.error);
```

**package.json 新增 script：**

```json
{
  "scripts": {
    "add-laws": "node scripts/add-laws.mjs",
    "ci": "npm run fetch-laws && npm run build-interp && npm run build"
  }
}
```

**使用方式：**

```bash
npm run add-laws
# 互動式提示，逐步完成所有步驟
```

---

### **方案 B：GitHub Actions 自動部署（其實已經存在，不用新建）**

當時以為要新建這個 workflow，但 repo 裡本來就有 `.github/workflows/update-laws.yml`
做一樣的事（push 到 main 時跑 fetch-laws + build + `wrangler pages deploy`，前提是
`CLOUDFLARE_API_TOKEN` secret 有設定）。不需要新建 `deploy-on-push.yml`，那會變成兩個
workflow 搶著跑、重複部署。以下保留原始構想內容供參考：

```yaml
name: Build & Deploy

on:
  push:
    branches: [main]
    paths:
      - 'scripts/**'
      - 'src/**'
      - 'raw/**'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Fetch laws & build
        run: npm run fetch-laws && npm run build-interp && npm run build

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist/ --project-name=labor-law-pwa
```

**設置步驟：**

1. GitHub Repo → Settings → Secrets and variables → Actions
2. 添加：
   - `CLOUDFLARE_API_TOKEN`（從 Cloudflare 控制台取得）
   - `CLOUDFLARE_ACCOUNT_ID`（同上）

3. 以後每次 `git push` 會自動：
   - 構建
   - 測試
   - 部署到 Cloudflare Pages

---

### **方案 C：改進文檔**

更新 `README.md` 的「常用指令」章節：

```markdown
## 常用指令

### 新增法規（推薦方法）

```bash
# 互動式工具，自動完成所有步驟
npm run add-laws
```

出現提示後依次輸入：
1. 法規名稱（如：工會法）
2. PCode（可從 https://law.moj.gov.tw 查詢）
3. molId（從勞動部網站查詢）
4. 修正日期（YYYYMMDD）

工具會自動：
- ✓ 驗證 PCode
- ✓ 更新 fetch-laws.mjs
- ✓ 更新 mol-laws.manifest.json
- ✓ 抓取條文
- ✓ 抓取函釋（如有）
- ✓ 構建所有檔案
- ✓ 詢問是否 commit & push

### 如果 fetch-interp-law 無檔案產生

這是正常的。若條文無勞動部函釋記錄，該條文的 JSON 檔案會被自動移除。查看 stdout 的 `Summary` 確認結果：

```
Summary
Law: 工會法 (N0020001)
Articles checked: 49
Raw files kept: 0         ← 0 表示無函釋
Interpretations: 0
```

### 手工方式（不推薦）

```bash
# 1. 編輯 scripts/fetch-laws.mjs，在 TARGETS 加入新 pcode
# 2. 編輯 scripts/mol-laws.manifest.json，加入法規對照
# 3. 抓取條文
npm run fetch-laws

# 4. 抓取函釋（可選，若無函釋則無新檔案產生）
npm run fetch-interp-law -- N0020001

# 5. 構建
npm run build-interp && npm run build

# 6. 本機測試（若有 wrangler 認證）
npm run dev

# 7. 提交
git add -A
git commit -m "feat: 新增工會法"
git push
```

### 部署說明

- **自動部署**（推薦）：Push 到 main 後，GitHub Actions 自動部署到 Cloudflare Pages
- **手工部署**：需要 CLOUDFLARE_API_TOKEN 環境變數

```bash
export CLOUDFLARE_API_TOKEN=<your-token>
npx wrangler pages deploy dist/
```
```

---

## 🎯 下次執行 T-0020 類任務的實際流程

（方案 A 的自動化腳本沒有建立，以下就是目前真的能跑的步驟——已同步到
`.github/labor-law-add-skill.md`，兩邊保持一致）

1. 查詢法規 pcode（搜尋「{法規名稱} 全國法規資料庫」）
2. 查詢 molId 與 versionDate（laws.mol.gov.tw）
3. `scripts/fetch-laws.mjs` 的 TARGETS 加一行
4. `scripts/mol-laws.manifest.json` 加一筆
5. `npm run fetch-laws`
6. `node scripts/fetch-mol-law-interpretations.mjs {PCode}`
7. `npm run build-interp && npm run build`
8. `git add`（只加這次動到的檔案）+ `git commit`
9. **先問 Alpha/Claude 要不要 push，同意才 push**——push 後網站會不會更新，
   取決於 `CLOUDFLARE_API_TOKEN` secret 有沒有設定

**預計耗時**：抓取 + build 約 5-10 分鐘；push/部署另外等確認，不算在內。

---

## 📝 後續可考慮的改進（優先順序低，目前沒有急迫性）

- 擴展 `index.json` schema（加入 description、hasInterpretations 等，用於未來的情境導讀/試算器）
- molId 查詢目前全靠人工，如果之後法規新增頻率變高，可以考慮做查詢輔助工具
- 建立法規更新日誌（變更追蹤）

---

## 🔗 相關資源

- **全國法規資料庫**：https://law.moj.gov.tw
- **勞動部法令查詢**：https://laws.mol.gov.tw
- **GitHub 鏡像**：https://github.com/kong0107/mojLawSplitJSON
- **Cloudflare Pages 部署文檔**：https://developers.cloudflare.com/pages/get-started/guide/

---

**最後更新**：2026-07-24（T-0020 完成後）
