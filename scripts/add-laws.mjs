/**
 * 新增一部法規到 labor-law-pwa（非互動式，供 SKILL / Copilot CLI 呼叫）。
 *
 * Usage:
 *   node scripts/add-laws.mjs --pcode N0090001 --name 就業服務法 --molId FL000348 --versionDate 20250120 [--skip-interp] [--commit] [--push]
 *
 * --skip-interp  跳過函釋抓取（法規函釋量很大、想先只看條文時用）
 * --commit       跑完 fetch + build 後自動 git add + commit
 * --push         搭配 --commit 才有作用，commit 完自動 git push
 */
import { readFile, writeFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIRROR = 'https://raw.githubusercontent.com/kong0107/mojLawSplitJSON/master/FalVMingLing';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { skipInterp: false, commit: false, push: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--pcode') opts.pcode = args[++i];
    else if (a === '--name') opts.name = args[++i];
    else if (a === '--molId') opts.molId = args[++i];
    else if (a === '--versionDate') opts.versionDate = args[++i];
    else if (a === '--skip-interp') opts.skipInterp = true;
    else if (a === '--commit') opts.commit = true;
    else if (a === '--push') opts.push = true;
  }
  return opts;
}

function usage() {
  console.log(
    'Usage: node scripts/add-laws.mjs --pcode <PCode> --name <法規名稱> --molId <FLxxxxxx> --versionDate <YYYYMMDD> [--skip-interp] [--commit] [--push]'
  );
}

async function readJson(file) {
  return JSON.parse((await readFile(file, 'utf8')).replace(/^﻿/, ''));
}

async function main() {
  const opts = parseArgs();
  if (!opts.pcode || !opts.name || !opts.molId || !opts.versionDate) {
    usage();
    process.exit(1);
  }
  const { pcode, name, molId, versionDate } = opts;

  if (!/^N\d{7}$/.test(pcode)) {
    console.warn(`⚠️  pcode 格式看起來不對：${pcode}（預期像 N0090001），請先手動確認再繼續`);
  }
  if (!/^FL\d{6}$/.test(molId)) {
    console.warn(`⚠️  molId 格式看起來不對：${molId}（預期像 FL000348），請先手動確認再繼續`);
  }
  if (!/^\d{8}$/.test(versionDate)) {
    console.error(`❌ versionDate 必須是 YYYYMMDD 格式，收到：${versionDate}`);
    process.exit(1);
  }

  console.log(`\n驗證 ${pcode}...`);
  const res = await fetch(`${MIRROR}/${pcode}.json`);
  if (!res.ok) {
    console.error(`❌ 抓不到 ${pcode}：HTTP ${res.status}`);
    process.exit(1);
  }
  const raw = await res.json();
  const actualName = raw['法規名稱'] || '';
  console.log(`  鏡像上的法規名稱：${actualName}`);
  if (actualName && !actualName.includes(name) && !name.includes(actualName)) {
    console.warn(`⚠️  你給的名稱「${name}」跟鏡像上的「${actualName}」對不太起來，請確認 pcode 有沒有抓錯`);
  }

  const fetchLawsPath = path.join(ROOT, 'scripts/fetch-laws.mjs');
  let fetchLawsSrc = await readFile(fetchLawsPath, 'utf8');
  if (fetchLawsSrc.includes(`'${pcode}'`)) {
    console.log(`  scripts/fetch-laws.mjs 已經有 ${pcode}，跳過`);
  } else {
    // 插入後只加自己的換行，不消耗原本 `[` 後面那個換行字元——
    // 這個檔案在 Windows 上是 CRLF，之前用 /\[\n/ 硬吃掉換行會在 CRLF 檔案上完全不匹配，
    // replace() 找不到匹配時靜默不做任何事，導致 TARGETS 沒真的被加，後面卻繼續往下跑。
    const updated = fetchLawsSrc.replace(/(const TARGETS = \[)/, `$1\n  '${pcode}', // ${name}`);
    if (updated === fetchLawsSrc || !updated.includes(`'${pcode}'`)) {
      throw new Error(`寫入 scripts/fetch-laws.mjs 失敗：找不到 "const TARGETS = [" 或寫入後仍未包含 ${pcode}，請人工檢查該檔案格式`);
    }
    fetchLawsSrc = updated;
    await writeFile(fetchLawsPath, fetchLawsSrc, 'utf8');
    console.log(`  ✓ scripts/fetch-laws.mjs 加入 ${pcode}`);
  }

  const manifestPath = path.join(ROOT, 'scripts/mol-laws.manifest.json');
  const manifest = await readJson(manifestPath);
  if (manifest[pcode]) {
    console.log(`  scripts/mol-laws.manifest.json 已經有 ${pcode}，跳過`);
  } else {
    manifest[pcode] = { name, molId, versionDate };
    const sorted = Object.keys(manifest)
      .sort()
      .reduce((acc, k) => ((acc[k] = manifest[k]), acc), {});
    await writeFile(manifestPath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
    console.log(`  ✓ scripts/mol-laws.manifest.json 加入 ${pcode}`);
  }

  console.log(`\n執行 npm run fetch-laws...`);
  execSync('npm run fetch-laws', { cwd: ROOT, stdio: 'inherit' });

  const lawJsonPath = path.join(ROOT, 'src/data/laws', `${pcode}.json`);
  try {
    await readFile(lawJsonPath, 'utf8');
  } catch {
    throw new Error(
      `fetch-laws 跑完了，但 src/data/laws/${pcode}.json 不存在——代表 ${pcode} 其實沒有真的被抓進去，` +
        `不要往下 commit。先檢查 scripts/fetch-laws.mjs 的 TARGETS 是不是真的有這個 pcode。`
    );
  }

  if (!opts.skipInterp) {
    console.log(`\n抓取函釋（${pcode}）...`);
    try {
      execSync(`node scripts/fetch-mol-law-interpretations.mjs ${pcode}`, { cwd: ROOT, stdio: 'inherit' });
    } catch {
      console.warn(`  ⚠️ 函釋抓取有錯誤或無資料，不影響條文本身，詳見上方輸出`);
    }
  } else {
    console.log('\n略過函釋抓取（--skip-interp）');
  }

  console.log(`\n執行 build-interp + build...`);
  execSync('npm run build-interp', { cwd: ROOT, stdio: 'inherit' });
  execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });

  console.log(`\n✅ ${name}（${pcode}）已抓取並 build 完成`);

  if (opts.commit) {
    console.log('\ngit add + commit...');
    const files = [
      'scripts/fetch-laws.mjs',
      'scripts/mol-laws.manifest.json',
      'src/data/laws',
      'src/data/interp',
      'raw/interpretations',
      'public/data',
    ];
    execSync(`git add ${files.join(' ')}`, { cwd: ROOT, stdio: 'inherit' });
    execSync(`git commit -m "feat: 新增${name}（${pcode}）"`, { cwd: ROOT, stdio: 'inherit' });
    if (opts.push) {
      console.log('\ngit push...');
      execSync('git push', { cwd: ROOT, stdio: 'inherit' });
      console.log('\n✅ 已 push 上 GitHub');
    } else {
      console.log('\n（未加 --push，變更只 commit 在本機，尚未推上 GitHub）');
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
