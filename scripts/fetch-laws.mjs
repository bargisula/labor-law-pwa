/**
 * 從全國法規資料庫的社群鏡像抓取目標法規，轉成本站用的精簡 JSON。
 *
 * 資料來源：kong0107/mojLawSplitJSON（定期同步官方「全國法規資料庫」整包開放資料）
 * 官方整包下載需申請帳號，日後若取得官方授權可把 MIRROR 換成官方端點。
 *
 * 輸出：
 *   src/data/laws/[PCODE].json  — 各法規全文（build 時由頁面 import）
 * 執行後記得再跑 build-search.mjs 更新搜尋索引（npm run fetch-laws 已串好）。
 */
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIRROR = 'https://raw.githubusercontent.com/kong0107/mojLawSplitJSON/master/FalVMingLing';

// Phase 1 目標法規。新增法規：加一行 pcode 即可。
const TARGETS = [
  'N0030001', // 勞動基準法
  'N0030002', // 勞動基準法施行細則
  'N0030006', // 勞工請假規則
  'N0030020', // 勞工退休金條例
  'N0030014', // 性別平等工作法
  'N0060001', // 職業安全衛生法
];

function formatDate(yyyymmdd) {
  if (!/^\d{8}$/.test(yyyymmdd)) return yyyymmdd;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

/** 官方格式 → 精簡格式。編章節標記行會變成後續條文的 chapter 欄位。 */
function transform(raw, pcode) {
  const articles = [];
  let chapter = '';
  for (const item of raw['法規內容'] ?? []) {
    if (item['編章節'] !== undefined) {
      chapter = (item['編章節'] || '').replace(/\s+/g, ' ').trim();
      continue;
    }
    const no = (item['條號'] || '').trim();
    const content = (item['條文內容'] || '').replace(/\r\n/g, '\n').trim();
    if (!no) continue;
    articles.push({
      // 「第 30-1 條」→ anchor id「30-1」
      id: no.replace(/[第條\s]/g, ''),
      no,
      chapter,
      content,
    });
  }
  return {
    pcode,
    name: raw['法規名稱'],
    nature: raw['法規性質'],
    updated: formatDate(raw['最新異動日期'] || ''),
    sourceUrl: raw['法規網址'] || `https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=${pcode}`,
    articles,
  };
}

async function main() {
  const lawsDir = path.join(ROOT, 'src', 'data', 'laws');
  await mkdir(lawsDir, { recursive: true });

  const lawList = [];

  for (const pcode of TARGETS) {
    const url = `${MIRROR}/${pcode}.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`抓取失敗 ${pcode}: HTTP ${res.status} ${url}`);
    const raw = await res.json();
    const law = transform(raw, pcode);
    if (law.articles.length === 0) throw new Error(`${pcode} 解析後條文數為 0，來源格式可能變了`);

    await writeFile(
      path.join(lawsDir, `${pcode}.json`),
      JSON.stringify(law, null, 1),
      'utf8'
    );
    lawList.push({
      pcode: law.pcode,
      name: law.name,
      updated: law.updated,
      articleCount: law.articles.length,
    });
    console.log(`✓ ${law.name}（${pcode}）${law.articles.length} 條，最新異動 ${law.updated}`);
  }

  const meta = { fetchedAt: new Date().toISOString().slice(0, 10), laws: lawList };
  await writeFile(path.join(lawsDir, 'index.json'), JSON.stringify(meta, null, 1), 'utf8');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
