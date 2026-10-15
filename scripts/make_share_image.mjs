// The link-preview image (1200 × 630) that shows when a page without its own
// image is shared, e.g. on LinkedIn or in an email: the name and the tagline
// on the paper, laid out like the Home hero. Project pages use their cover.
// Writes public/og.jpg. Run it again after changing the name or the tagline
// in src/content/text/site.md:
//   npm run share-image
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(siteDir, 'public', 'og.jpg');
// The two lines it needs from the front matter of site.md.
const front = readFileSync(path.join(siteDir, 'src', 'content', 'text', 'site.md'), 'utf8').split(/^---\s*$/m)[1] ?? '';
const field = (key) => {
  const match = front.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  if (!match) throw new Error(`No "${key}:" line in src/content/text/site.md`);
  return match[1].trim().replace(/^(["'])(.*)\1$/, '$2');
};
const site = { name: field('name'), tagline: field('tagline') };
const escape = (text) => text.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=switzer@1&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400&display=swap">
<style>
  /* The site's paper, ink tones and four hairline columns (src/styles/tokens.css). */
  body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #f3f3f1; }
  .lines { position: absolute; inset: 0 64px; display: grid; grid-template-columns: repeat(4, 1fr); }
  .lines span { border-left: 1px solid rgb(0 0 0 / 0.06); }
  .lines span:last-child { border-right: 1px solid rgb(0 0 0 / 0.06); }
  .text { position: absolute; left: calc(64px + (1200px - 128px) / 4); right: 64px; top: 50%; transform: translateY(-50%); }
  h1 { margin: 0; color: #16181b; font: 440 112px/1.02 Switzer, sans-serif; letter-spacing: -0.03em; }
  p { margin: 28px 0 0; max-width: 620px; color: #4b4f55; font: 400 38px/1.3 'Source Serif 4', serif; }
</style></head><body>
<div class="lines"><span></span><span></span><span></span><span></span></div>
<div class="text"><h1>${escape(site.name)}</h1><p>${escape(site.tagline)}</p></div>
</body></html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out, type: 'jpeg', quality: 88 });
  console.log(`saved ${out}`);
} finally {
  await browser.close();
}
