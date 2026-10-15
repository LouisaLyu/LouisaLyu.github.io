// Lighthouse scores for every page, as a phone and on a desktop. Run
// `npm run build` first. It previews dist/ locally unless given a live URL:
//   npm run lighthouse                          (local preview of dist/)
//   npm run lighthouse -- https://example.com   (the live site)
// Full reports go to test-results/lighthouse/. The target is 90 or more in
// every category; the script exits with an error if any page falls short.
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import { chromium } from '@playwright/test';
import { preview } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const outDir = path.join(root, 'test-results', 'lighthouse');
const TARGET = 90;
const DEBUG_PORT = 9339;

// Every page in dist/, as URL paths.
const pages = (await fs.readdir(dist, { recursive: true }))
  .filter((file) => path.basename(file) === 'index.html')
  .map((file) => `/${path.dirname(file).split(path.sep).join('/')}/`.replace('/./', '/'))
  .sort();

const server = process.argv[2] ? null : await preview({ root, server: { port: 4323 }, logLevel: 'error' });
const base = (process.argv[2] ?? 'http://localhost:4323').replace(/\/$/, '');
const browser = await chromium.launch({ channel: 'chromium', args: [`--remote-debugging-port=${DEBUG_PORT}`] });
await fs.mkdir(outDir, { recursive: true });

const rows = [];
try {
  for (const page of pages) {
    for (const [device, config] of [['phone', undefined], ['desktop', desktopConfig]]) {
      const { lhr, report } = await lighthouse(`${base}${page}`, { port: DEBUG_PORT, output: 'html', logLevel: 'error' }, config);
      const scores = Object.fromEntries(Object.values(lhr.categories).map((c) => [c.id, Math.round(c.score * 100)]));
      const name = page === '/' ? 'home' : page.slice(1, -1).replaceAll('/', '-');
      await fs.writeFile(path.join(outDir, `${name}-${device}.html`), report);
      rows.push({ page, device, scores });
    }
  }
} finally {
  await browser.close();
  await server?.stop();
}

const categories = Object.keys(rows[0].scores);
console.log(`\n${'page'.padEnd(28)}${'device'.padEnd(9)}${categories.join('  ')}`);
for (const { page, device, scores } of rows) {
  const cells = categories.map((id) => String(scores[id]).padStart(id.length));
  console.log(`${page.padEnd(28)}${device.padEnd(9)}${cells.join('  ')}`);
}
const low = rows.filter(({ scores }) => Object.values(scores).some((s) => s < TARGET));
console.log(low.length ? `\n${low.length} result(s) under ${TARGET}. Reports: ${outDir}` : `\nEvery score is ${TARGET} or more.`);
process.exitCode = low.length ? 1 : 0;
