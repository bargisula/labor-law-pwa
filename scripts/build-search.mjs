/**
 * 生成前端搜尋索引 public/data/search.json。
 * 來源：src/data/laws/（法規條文全文）+ src/data/interp/（函釋要旨）。
 * 函釋只索引「要旨」不索引全文，控制 PWA 離線快取體積。
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LAWS_DIR = path.join(ROOT, 'src', 'data', 'laws');
const INTERP_DIR = path.join(ROOT, 'src', 'data', 'interp');

async function main() {
  const docs = [];

  const meta = JSON.parse(await readFile(path.join(LAWS_DIR, 'index.json'), 'utf8'));
  for (const { pcode } of meta.laws) {
    const law = JSON.parse(await readFile(path.join(LAWS_DIR, `${pcode}.json`), 'utf8'));
    for (const a of law.articles) {
      docs.push({
        id: `law:${pcode}:${a.id}`,
        kind: 'law',
        lawName: law.name,
        label: a.no,
        href: `/laws/${pcode}/#art-${a.id}`,
        content: a.content,
      });
    }
  }

  let interpCount = 0;
  try {
    for (const pcode of await readdir(INTERP_DIR)) {
      if (pcode.endsWith('.json')) continue;
      for (const file of await readdir(path.join(INTERP_DIR, pcode))) {
        const data = JSON.parse(await readFile(path.join(INTERP_DIR, pcode, file), 'utf8'));
        for (const it of data.items) {
          docs.push({
            id: `interp:${pcode}:${data.article}:${it.recordNo}`,
            kind: 'interp',
            lawName: data.lawName,
            label: `第 ${data.article} 條函釋・${it.date}`,
            href: `/interp/${pcode}/${data.article}/#rec-${it.recordNo}`,
            content: it.gist,
          });
          interpCount++;
        }
      }
    }
  } catch {
    // 還沒有函釋資料，只索引法規
  }

  // 常見情境（人工策展）：標題+關鍵詞+導讀進索引，口語查詢可直達情境頁
  let scenarioCount = 0;
  try {
    const sc = JSON.parse(
      await readFile(path.join(ROOT, 'src', 'data', 'scenarios.json'), 'utf8')
    );
    for (const s of sc.scenarios) {
      docs.push({
        id: `scenario:${s.id}`,
        kind: 'scenario',
        lawName: '常見情境',
        label: s.title,
        href: `/scenarios/${s.id}/`,
        content: [s.oneLiner, ...(s.keywords || []), ...(s.summary || [])].join('。'),
      });
      scenarioCount++;
    }
  } catch {
    // 還沒有情境資料
  }

  const outDir = path.join(ROOT, 'public', 'data');
  await mkdir(outDir, { recursive: true });
  await writeFile(
    path.join(outDir, 'search.json'),
    JSON.stringify({ fetchedAt: meta.fetchedAt, laws: meta.laws, docs }),
    'utf8'
  );
  console.log(
    `✓ search.json：條文 ${docs.length - interpCount - scenarioCount} 筆 + 函釋要旨 ${interpCount} 筆 + 情境 ${scenarioCount} 筆`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
