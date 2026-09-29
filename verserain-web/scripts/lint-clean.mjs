#!/usr/bin/env node
// npm run lint:clean
//
// `npm run lint` still fails on App.jsx's old warnings, so it can't gate new
// work. This lints only the files listed in CLEAN_FILES (eslint.config.js) —
// src/ui, src/pages and the pages already written to the design system — and
// fails on any error or warning, including the design-system guard (no
// inline-styled <button>, no hard-coded colours). LEGACY_FILES — pages moved
// out of App.jsx as they were — are skipped until they are cleaned up.
import { relative } from 'node:path';
import { ESLint } from 'eslint';
import { CLEAN_FILES, LEGACY_FILES } from '../eslint.config.js';

const eslint = new ESLint();
const results = (await eslint.lintFiles(CLEAN_FILES))
  .filter((r) => !LEGACY_FILES.includes(relative(process.cwd(), r.filePath)));
const formatter = await eslint.loadFormatter('stylish');
const problems = results.reduce((n, r) => n + r.errorCount + r.warningCount, 0);
if (problems) {
  console.log(await formatter.format(results));
  process.exit(1);
}
console.log(`✓ lint:clean — ${results.length} files, 0 problems`);
