/**
 * Fetch Ministry of Labor interpretations for one law article and write a
 * browser-readable JSON file under public/data.
 *
 * Default target: Labor Standards Act, article 39.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://laws.mol.gov.tw/FLAW/';

const LAW_ID = process.argv[2] || 'FL014930';
const ARTICLE_NO = process.argv[3] || '39';
const LAW_DATE = process.argv[4] || '20240731';

const outputFile =
  process.argv[5] ||
  path.join(ROOT, 'public', 'data', 'labor-standards-act-article-39-interpretations.json');

const rtype =
  'E%2f47%2f%e8%a1%8c%e6%94%bf%e5%87%bd%e9%87%8b%2cL%2f4%2f%e7%9b%b8%e9%97%9c%e6%b3%95%e6%a2%9d%2cH%2f2%2f%e6%ad%b7%e5%8f%b2%e6%b3%95%e6%a2%9d';

function decodeEntities(value) {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#32;/g, ' ')
    .replace(/&#(x?[0-9a-fA-F]+);/g, (_, n) =>
      String.fromCodePoint(n[0].toLowerCase() === 'x' ? Number.parseInt(n.slice(1), 16) : Number.parseInt(n, 10))
    );
}

function htmlToText(html) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;|&#32;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function between(text, start, endMarkers) {
  const startIndex = text.indexOf(start);
  if (startIndex < 0) return '';
  const from = startIndex + start.length;
  let to = text.length;
  for (const marker of endMarkers) {
    const index = text.indexOf(marker, from);
    if (index >= 0 && index < to) to = index;
  }
  return text.slice(from, to).replace(/\s+/g, ' ').trim();
}

function buildListUrl(page) {
  const suffix = page > 1 ? `&page=${page}` : '';
  return `${BASE}FLAWDOC02.aspx?rtype=${rtype}&id=${LAW_ID}&flno=${ARTICLE_NO}&ldate=${LAW_DATE}${suffix}`;
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

function extractDetailLinks(html) {
  return [...html.matchAll(/<a[^>]+href="([^"]*FLAWDOC03\.aspx[^"]*)"[^>]*>/gi)].map((match) => {
    const href = decodeEntities(match[1]);
    return href.startsWith('http') ? href : new URL(href, BASE).href;
  });
}

function parseDetail(text, sourceUrl) {
  const rawGist = between(text, '要 旨：', ['主 旨：', '說 明：', '正 本：', '共 47 筆']);
  const fullTextFromGist = rawGist.includes('全文內容：') ? rawGist.split('全文內容：').slice(1).join('全文內容：').trim() : '';
  const gist = rawGist.includes('全文內容：') ? rawGist.split('全文內容：')[0].trim() : rawGist;
  const explanation = between(text, '說 明：', ['正 本：', '副 本：', '編 註：', '共 47 筆']);
  const fullText = [between(text, '主 旨：', ['說 明：', '正 本：', '共 47 筆']), explanation || fullTextFromGist]
    .filter(Boolean)
    .join('\n');
  const documentNo = between(text, '發文字號：', ['發文日期：']);

  return {
    recordNo: Number(between(text, '現在第', ['筆'])) || null,
    issuingAgency: between(text, '發文單位：', ['發文字號：']),
    documentNo,
    date: between(text, '發文日期：', ['資料來源：', '相關法條：']),
    source: between(text, '資料來源：', ['相關法條：', '要 旨：']),
    relatedArticles: between(text, '相關法條：', ['要 旨：']),
    gist,
    subject: between(text, '主 旨：', ['說 明：', '正 本：', '共 47 筆']),
    explanation,
    fullText,
    isRepealed: /^廢\s/.test(documentNo),
    sourceUrl,
  };
}

async function main() {
  const firstHtml = await fetchText(buildListUrl(1));
  const firstText = htmlToText(firstHtml);
  const total = Number((firstText.match(/共\s+(\d+)\s+筆/) || [])[1] || 0);
  const pageCount = Number((firstText.match(/第\s+1\s+\/\s+(\d+)\s+頁/) || [])[1] || 1);

  const allLinks = [];
  for (let page = 1; page <= pageCount; page += 1) {
    const html = page === 1 ? firstHtml : await fetchText(buildListUrl(page));
    for (const link of extractDetailLinks(html)) allLinks.push(link);
  }

  const interpretations = [];
  for (const [index, url] of allLinks.entries()) {
    const detailHtml = await fetchText(url);
    interpretations.push(parseDetail(htmlToText(detailHtml), url));
    console.log(`Fetched ${index + 1}/${allLinks.length}`);
  }

  const data = {
    schemaVersion: 1,
    fetchedAt: new Date().toISOString(),
    law: {
      id: LAW_ID,
      name: '勞動基準法',
      articleNo: ARTICLE_NO,
      articleTitle: `第 ${ARTICLE_NO} 條`,
      effectiveDate: LAW_DATE,
      sourceUrl: `https://laws.mol.gov.tw/FLAW/FLAWDOC01.aspx?id=${LAW_ID}&flno=${ARTICLE_NO}`,
      interpretationsUrl: buildListUrl(1),
    },
    total,
    pageCount,
    count: interpretations.length,
    interpretations,
  };

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${outputFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
