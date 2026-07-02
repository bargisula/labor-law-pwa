/**
 * 把 raw/interpretations/ 的函釋原始檔清洗成網站用格式。
 *
 * 原始檔規範（由 Codex 或其他工具抓取）：
 *   - 檔名：<法規代號>-<條號>.json，例 N0030001-39.json
 *   - 內容：schemaVersion 1，見 README「函釋資料」一節
 *
 * 輸出：
 *   src/data/interp/<pcode>/<條號>.json  — 單條函釋全文（build 時渲染頁面）
 *   src/data/interp/index.json           — { pcode: { 條號: 則數 } }，條文頁用來顯示連結
 *
 * 執行後記得再跑 build-search.mjs 更新搜尋索引。
 */
import { readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW_DIR = path.join(ROOT, 'raw', 'interpretations');
const OUT_DIR = path.join(ROOT, 'src', 'data', 'interp');

/** 去掉固定寬度排版殘留的空格（兩個中文字/標點之間的半形空格），保留換行 */
function cleanText(text) {
  if (!text) return '';
  const cjk = '一-鿿，。、；：（）「」『』？！';
  let t = text.replace(new RegExp(`(?<=[${cjk}]) +(?=[${cjk}])`, 'g'), '');
  // 「。一、」「：（一）」等列點處補換行，閱讀較舒服
  t = t.replace(/([。：])(?=（?[一二三四五六七八九十]{1,3}[、）])/g, '$1\n');
  return t.trim();
}

async function main() {
  let files = [];
  try {
    files = (await readdir(RAW_DIR)).filter((f) => f.endsWith('.json'));
  } catch {
    console.log('raw/interpretations/ 不存在，略過');
  }

  // 全部重新生成，避免刪掉的 raw 檔在輸出區殘留
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const index = {};
  for (const file of files) {
    const m = file.match(/^([A-Z]\d{7})-([\d-]+)\.json$/);
    if (!m) throw new Error(`檔名不符規範（<pcode>-<條號>.json）：${file}`);
    const [, pcode, article] = m;

    const raw = JSON.parse(await readFile(path.join(RAW_DIR, file), 'utf8'));
    if (raw.schemaVersion !== 1) throw new Error(`${file}: schemaVersion 不是 1`);
    if (!Array.isArray(raw.interpretations) || raw.interpretations.length === 0)
      throw new Error(`${file}: interpretations 空的`);

    const items = raw.interpretations.map((it, i) => {
      // fullText 選填：部分早期函釋官方資料庫僅有要旨、無全文
      for (const field of ['documentNo', 'gist']) {
        if (!it[field]) throw new Error(`${file} 第 ${i + 1} 筆缺 ${field}`);
      }
      return {
        recordNo: it.recordNo ?? i + 1,
        agency: it.issuingAgency || '',
        documentNo: cleanText(it.documentNo),
        date: it.date || '',
        gist: cleanText(it.gist),
        relatedArticles: cleanText(it.relatedArticles),
        fullText: cleanText(it.fullText),
        isRepealed: !!it.isRepealed,
        sourceUrl: it.sourceUrl || '',
      };
    });

    const out = {
      pcode,
      article,
      lawName: raw.law?.name || '',
      articleTitle: raw.law?.articleTitle || `第 ${article} 條`,
      fetchedAt: (raw.fetchedAt || '').slice(0, 10),
      sourceUrl: raw.law?.interpretationsUrl || raw.law?.sourceUrl || '',
      items,
    };
    await mkdir(path.join(OUT_DIR, pcode), { recursive: true });
    await writeFile(
      path.join(OUT_DIR, pcode, `${article}.json`),
      JSON.stringify(out, null, 1),
      'utf8'
    );
    (index[pcode] ??= {})[article] = items.length;
    console.log(`✓ ${out.lawName} 第 ${article} 條：${items.length} 則函釋（${items.filter((x) => x.isRepealed).length} 則已廢止）`);
  }

  await writeFile(path.join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 1), 'utf8');
  console.log(`✓ index.json 完成，共 ${files.length} 個條文的函釋`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
