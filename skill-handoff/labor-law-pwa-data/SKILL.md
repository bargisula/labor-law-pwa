---
name: labor-law-pwa-data
description: Add or update law text and Ministry of Labor interpretations in C:\Users\alpha\labor-law-pwa using the project data pipeline. Use when the user asks to add labor-law-pwa legal data, fetch MOL interpretations for one article or an entire law, add a law by pcode/name/URL, validate raw/interpretations JSON, or harden the legal-data ingestion workflow.
---

# Labor Law PWA Data

## Objective

Maintain `C:\Users\alpha\labor-law-pwa` legal data through executable ingestion and validation. Treat success as official-source data fetched into the repo pipeline and verified by project scripts, not as a written plan.

## Success And Failure

Success:

- Law text is fetched through `scripts/fetch-laws.mjs` and `npm run fetch-laws`.
- Interpretation raw files are written under `raw/interpretations/<pcode>-<article>.json`.
- Whole-law interpretation batches use `npm run fetch-interp-law -- <pcode>` or `node scripts/fetch-mol-law-interpretations.mjs <pcode>` when available.
- Single-article interpretation fetches use the existing article crawler.
- Empty interpretation results do not leave empty raw files.
- `npm run build-interp` completes successfully unless the user explicitly asks only to fetch.
- The final report lists laws, article counts, interpretation counts, repealed counts, validation output, and whether git commit/push happened.

Failure:

- Writing generated data manually into `public/data/`, `src/data/`, or `dist/`.
- Fetching interpretations before the law text exists in `src/data/laws/<pcode>.json`.
- Using FL-ID in raw filenames instead of pcode.
- Guessing or summarizing official interpretation text.
- Presenting the work as done when fetches or validation were blocked.
- Committing or pushing unless the user explicitly asks.

## Hard Rules

- Do not write generated output directly to `public/data/`, `src/data/`, or `dist/`.
- Do not modify `src/pages/` or `scenarios.json` during data ingestion.
- Do not rewrite crawler behavior unless the user explicitly asks to improve scripts.
- Do not commit or push unless the user separately requests it.
- If validation fails, fix only `raw/interpretations` schema/content issues unless the user asked for script work.
- Keep raw filenames keyed by National Laws and Regulations Database pcode.

## Known Law Mapping

Use `scripts/mol-laws.manifest.json` when present. Current known mappings:

| pcode | 法規名稱 | MOL ID | 版本日期 |
|---|---|---|---|
| `N0030001` | 勞動基準法 | `FL014930` | `20240731` |
| `N0030014` | 性別平等工作法 | `FL015149` | `20230816` |
| `N0030020` | 勞工退休金條例 | `FL030634` | `20190515` |
| `N0060001` | 職業安全衛生法 | `FL015013` | `20251219` |

If a target law is missing from the manifest, confirm the MOL ID and version date from `laws.mol.gov.tw`, then add the mapping before running a whole-law batch.

## Workflow

### 1. Preflight

1. Work from `C:\Users\alpha\labor-law-pwa`.
2. Check the user request for law names, pcodes, article numbers, and whether the scope is one article or the whole law.
3. Check for existing law text at `src/data/laws/<pcode>.json` before fetching interpretations.
4. Preserve unrelated dirty files. Do not revert user changes.

### 2. Add Law Text

For a new law:

1. Confirm the official pcode from `law.moj.gov.tw`.
2. Add the pcode to `TARGETS` in `scripts/fetch-laws.mjs`.
3. Run:

```powershell
npm run fetch-laws
```

4. Confirm the console count roughly matches the official mirror expectation.

If the configured source fails or returns 404, report the blocker. Do not hand-build law text from arbitrary sites.

### 3. Fetch Interpretations For A Whole Law

Prefer the whole-law batch script whenever the user asks for all interpretations of a law:

```powershell
npm run fetch-interp-law -- <pcode>
```

Equivalent direct command:

```powershell
node scripts/fetch-mol-law-interpretations.mjs <pcode>
```

For a subset of articles:

```powershell
npm run fetch-interp-law -- <pcode> --articles=12,15,84-1
```

The batch script must:

- Read `scripts/mol-laws.manifest.json` for law name, MOL ID, and version date.
- Read article ids from `src/data/laws/<pcode>.json`.
- Call `scripts/fetch-mol-article-interpretations.mjs` for each article.
- Write only `raw/interpretations/<pcode>-<article>.json`.
- Remove files for zero-interpretation articles.
- Print a summary of checked articles, kept raw files, total interpretations, repealed interpretations, empty articles, and failed articles.

### 4. Fetch Interpretations For One Article

Use the existing article crawler:

```powershell
node scripts/fetch-mol-article-interpretations.mjs <FL-ID> <article> <version-date> raw/interpretations/<pcode>-<article>.json <法規名稱>
```

Examples:

```powershell
node scripts/fetch-mol-article-interpretations.mjs FL014930 24 20240731 raw/interpretations/N0030001-24.json 勞動基準法
node scripts/fetch-mol-article-interpretations.mjs FL014930 84-1 20240731 raw/interpretations/N0030001-84-1.json 勞動基準法
```

If an article has zero interpretations, delete the empty raw file and report zero results.

### 5. Validate

Run:

```powershell
npm run build-interp
```

If the user expects a deployable frontend build, also run:

```powershell
npm run build
```

Raw interpretation schema version 1:

- `law.name` required
- `law.articleNo` required
- each interpretation needs `documentNo` and `gist`
- preserve official `fullText` when provided
- mark repealed records with `isRepealed`

### 6. Report

Report in Chinese, briefly and concretely:

```markdown
| 新增法規 | pcode | 條數 |
|---|---|---:|
| <法規名稱> | <pcode> | <N> |

| 函釋 | 條號 | 函釋數 | 已廢止 |
|---|---:|---:|---:|
| <法規名稱> | <article> | <N> | <M> |

`npm run build-interp` 完整輸出：

```text
<complete output>
```

沒有 commit。
沒有 push。
```

Mention any failed or skipped articles explicitly.
