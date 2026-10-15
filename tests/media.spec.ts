// Media budgets on the built files: every image a current browser downloads is
// 500 KB or less, every video is 5 MB or less, and no video plays on its own.
import { test, expect } from '@playwright/test';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { builtPages, dist } from './pages';

const KB = 1000;
const budgets = { image: 500 * KB, video: 5000 * KB };
const kinds: Record<string, keyof typeof budgets> = {
  '.avif': 'image', '.webp': 'image', '.jpg': 'image', '.jpeg': 'image', '.png': 'image', '.gif': 'image', '.svg': 'image',
  '.mp4': 'video', '.webm': 'video',
};

/** Local files named in src, srcset (every candidate) and poster attributes. */
function refs(html: string): string[] {
  return [...html.matchAll(/(?:src|srcset|poster)="([^"]+)"/g)]
    .flatMap((match) => match[1].split(',').map((candidate) => candidate.trim().split(/\s+/)[0]))
    .filter((ref) => ref.startsWith('/') && !ref.startsWith('//') && kinds[path.extname(ref).toLowerCase()]);
}

test('media budgets', async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'The files are the same at every size.');
  const delivered = new Set<string>();
  const fallbacks = new Set<string>();
  const autoplay: string[] = [];
  for (const page of builtPages()) {
    let html = readFileSync(path.join(dist, page, 'index.html'), 'utf8');
    if (/<video[^>]*\sautoplay/.test(html)) autoplay.push(page);
    // A <picture> lists its formats best first, and a browser downloads the first
    // one it supports: AVIF in every current browser. The WebP and JPEG after it
    // only reach older browsers, so they are reported but do not fail the check.
    for (const [picture] of html.matchAll(/<picture\b[\s\S]*?<\/picture>/g)) {
      const [best, ...rest] = picture.match(/<source\b[^>]*>/g) ?? [];
      refs(best ?? picture).forEach((ref) => delivered.add(ref));
      if (best) refs(rest.join('') + picture.replace(/<source\b[^>]*>/g, '')).forEach((ref) => fallbacks.add(ref));
    }
    html = html.replace(/<picture\b[\s\S]*?<\/picture>/g, '');
    refs(html).forEach((ref) => delivered.add(ref));
  }

  const over = (files: Set<string>) =>
    [...files].flatMap((ref) => {
      const kind = kinds[path.extname(ref).toLowerCase()];
      const size = statSync(path.join(dist, decodeURIComponent(ref))).size;
      return size > budgets[kind] ? [`${ref}: ${Math.round(size / KB)} KB (${kind} budget ${budgets[kind] / KB} KB)`] : [];
    });
  for (const line of over(fallbacks)) console.warn(`  older browsers only: ${line}`);
  expect(delivered.size, 'media files found').toBeGreaterThan(0);
  expect(autoplay, 'pages with an autoplaying video').toEqual([]);
  expect(over(delivered)).toEqual([]);
});
