/**
 * Fetch Ministry of Labor interpretations for every article of one law.
 *
 * Usage:
 *   node scripts/fetch-mol-law-interpretations.mjs <pcode> [--articles=12,15,84-1] [--dry-run]
 */
import { spawn } from 'node:child_process';
import { mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(ROOT, 'scripts', 'fetch-mol-article-interpretations.mjs');
const MANIFEST = path.join(ROOT, 'scripts', 'mol-laws.manifest.json');
const RAW_DIR = path.join(ROOT, 'raw', 'interpretations');

const args = process.argv.slice(2);
const pcode = args.find((arg) => !arg.startsWith('--'));
const dryRun = args.includes('--dry-run');
const articlesArg = args.find((arg) => arg.startsWith('--articles='));

function usage() {
  console.log('Usage: node scripts/fetch-mol-law-interpretations.mjs <pcode> [--articles=12,15,84-1] [--dry-run]');
}

function parseArticleFilter() {
  if (!articlesArg) return null;
  return new Set(
    articlesArg
      .slice('--articles='.length)
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

async function readJson(file) {
  const text = await readFile(file, 'utf8');
  return JSON.parse(text.replace(/^\uFEFF/, ''));
}

function runNode(commandArgs) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, commandArgs, {
      cwd: ROOT,
      stdio: 'inherit',
      shell: false,
    });
    child.on('close', (code) => resolve(code ?? 1));
  });
}

async function main() {
  if (!pcode || args.includes('--help')) {
    usage();
    process.exitCode = pcode ? 0 : 1;
    return;
  }

  const manifest = await readJson(MANIFEST);
  const config = manifest[pcode];
  if (!config) {
    throw new Error(`No MOL manifest entry for ${pcode}. Add molId and versionDate to scripts/mol-laws.manifest.json.`);
  }

  const lawFile = path.join(ROOT, 'src', 'data', 'laws', `${pcode}.json`);
  const law = await readJson(lawFile);
  if (!Array.isArray(law.articles) || law.articles.length === 0) {
    throw new Error(`No law articles found in ${lawFile}. Run npm run fetch-laws first.`);
  }

  const filter = parseArticleFilter();
  const articles = law.articles
    .map((article) => String(article.id))
    .filter((articleNo) => !filter || filter.has(articleNo));

  if (articles.length === 0) {
    throw new Error(`No matching articles for ${pcode}${filter ? `: ${[...filter].join(', ')}` : ''}.`);
  }

  await mkdir(RAW_DIR, { recursive: true });

  console.log(`${dryRun ? '[dry-run] ' : ''}${config.name} (${pcode})`);
  console.log(`MOL ID: ${config.molId}`);
  console.log(`Version date: ${config.versionDate}`);
  console.log(`Articles: ${articles.join(', ')}`);

  const results = [];

  for (const articleNo of articles) {
    const outputFile = path.join(RAW_DIR, `${pcode}-${articleNo}.json`);
    const commandArgs = [
      SCRIPT,
      config.molId,
      articleNo,
      config.versionDate,
      outputFile,
      config.name,
    ];

    if (dryRun) {
      console.log(`Would fetch ${config.name} 第 ${articleNo} 條 -> ${path.relative(ROOT, outputFile)}`);
      results.push({ articleNo, status: 'dry-run', count: 0, repealed: 0 });
      continue;
    }

    console.log(`\nFetching ${config.name} 第 ${articleNo} 條`);
    const code = await runNode(commandArgs);
    if (code !== 0) {
      results.push({ articleNo, status: 'failed', count: 0, repealed: 0 });
      continue;
    }

    const data = await readJson(outputFile);
    const interpretations = Array.isArray(data.interpretations) ? data.interpretations : [];
    const repealed = interpretations.filter((item) => item?.isRepealed).length;

    if (interpretations.length === 0) {
      await rm(outputFile, { force: true });
      console.log(`No interpretations; removed ${path.relative(ROOT, outputFile)}`);
      results.push({ articleNo, status: 'empty', count: 0, repealed: 0 });
      continue;
    }

    console.log(`Kept ${path.relative(ROOT, outputFile)} (${interpretations.length} interpretations, ${repealed} repealed)`);
    results.push({ articleNo, status: 'kept', count: interpretations.length, repealed });
  }

  const kept = results.filter((result) => result.status === 'kept');
  const failed = results.filter((result) => result.status === 'failed');
  const total = kept.reduce((sum, result) => sum + result.count, 0);
  const repealedTotal = kept.reduce((sum, result) => sum + result.repealed, 0);

  console.log('\nSummary');
  console.log(`Law: ${config.name} (${pcode})`);
  console.log(`Articles checked: ${results.length}`);
  console.log(`Raw files kept: ${kept.length}`);
  console.log(`Interpretations: ${total}`);
  console.log(`Repealed: ${repealedTotal}`);
  console.log(`Empty articles: ${results.filter((result) => result.status === 'empty').length}`);
  console.log(`Failed articles: ${failed.length}`);

  if (failed.length > 0) {
    console.log(`Failed article numbers: ${failed.map((result) => result.articleNo).join(', ')}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


