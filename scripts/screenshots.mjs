// Full-page screenshots of every page at phone, tablet and desktop widths,
// taken from the built site in dist/ (run `npm run build` first).
//
// Usage: npm run screenshots -- <outDir> [widths]
//   e.g. npm run screenshots -- ../process/2026-09-23_wireframes 390,810,1440
import { chromium } from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const outDir = path.resolve(process.argv[2] ?? 'screenshots');
const widths = (process.argv[3] ?? '390,810,1440').split(',').map(Number);
const heights = { 390: 844, 810: 1080, 1440: 900 };
const only = process.argv[4]?.split(','); // optional: just these page names, e.g. home,about
const allPages = [
  ['home', '/'],
  ['work', '/work/'],
  ['beyond-pure-digital', '/work/beyond-pure-digital/'],
  ['daily-weather-comparison', '/work/daily-weather-comparison/'],
  ['about', '/about/'],
  ['contact', '/contact/'],
  ['404', '/no-such-page/'],
];
const pages = only ? allPages.filter(([name]) => only.includes(name)) : allPages;
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.xml': 'application/xml', '.woff2': 'font/woff2',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.vtt': 'text/vtt',
};

// A tiny static server for dist/, falling back to 404.html like a real host.
async function findFile(url) {
  const clean = decodeURIComponent(url.split('?')[0]);
  for (const candidate of [clean, path.join(clean, 'index.html'), `${clean}.html`]) {
    const file = path.join(root, candidate);
    if (!file.startsWith(root)) continue;
    try {
      if ((await fs.stat(file)).isFile()) return file;
    } catch {}
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  const file = await findFile(req.url ?? '/');
  const served = file ?? path.join(root, '404.html');
  res.writeHead(file ? 200 : 404, { 'content-type': types[path.extname(served)] ?? 'application/octet-stream' });
  res.end(await fs.readFile(served));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
try {
  for (const width of widths) {
    // Reduced motion shows scroll-reveal content immediately, since a full-page capture doesn't scroll.
    const page = await browser.newPage({ viewport: { width, height: heights[width] ?? 900 }, reducedMotion: 'reduce' });
    for (const [name, url] of pages) {
      await page.goto(base + url, { waitUntil: 'networkidle' });
      // Load lazy images too, since a full-page capture doesn't scroll: switch them to
      // eager, scroll through the page, then wait until every image has decoded.
      await page.evaluate(async () => {
        for (const img of document.images) img.loading = 'eager';
        for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight) {
          window.scrollTo(0, y);
          await new Promise((done) => setTimeout(done, 60));
        }
        window.scrollTo(0, 0);
        await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
      });
      const file = path.join(outDir, `${name}-${width}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`saved ${file}`);
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
