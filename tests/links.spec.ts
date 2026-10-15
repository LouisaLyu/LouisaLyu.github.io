// Follows every internal link from Home: each page must load, every in-page
// anchor (#…) must point at an element, and nothing on a page may fail to load.
import { test, expect } from '@playwright/test';
import { missingPage } from './pages';

test('internal links and anchors resolve', async ({ page, baseURL }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'The links are the same at every size.');
  test.setTimeout(120_000);
  const origin = new URL(baseURL!).origin;
  const broken: string[] = [];
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin === origin && response.status() >= 400 && url.pathname !== missingPage) {
      broken.push(`${response.status()} ${url.pathname}`);
    }
  });

  const queue = ['/'];
  const ids = new Map<string, Set<string>>();
  const anchors: { from: string; to: string; id: string }[] = [];
  while (queue.length) {
    const path = queue.shift()!;
    const response = await page.goto(path);
    if (response?.status() !== 200) broken.push(`${response?.status()} ${path}`);
    ids.set(path, new Set(await page.$$eval('[id]', (els) => els.map((el) => el.id))));
    for (const href of await page.$$eval('a[href]', (links) => links.map((a) => a.getAttribute('href')!))) {
      const url = new URL(href, page.url());
      if (url.origin !== origin) continue;
      if (url.hash) anchors.push({ from: path, to: url.pathname, id: decodeURIComponent(url.hash.slice(1)) });
      if (!ids.has(url.pathname) && !queue.includes(url.pathname)) queue.push(url.pathname);
    }
  }
  for (const { from, to, id } of anchors) {
    if (!ids.get(to)?.has(id)) broken.push(`#${id} on ${to} (linked from ${from})`);
  }

  expect(ids.size, 'pages reached from Home').toBeGreaterThan(5);
  expect(broken).toEqual([]);
  // The host shows the site's own 404 page for a missing address.
  const missing = await page.goto(missingPage);
  expect(missing?.status()).toBe(404);
  await expect(page.locator('h1')).toBeVisible();
});
