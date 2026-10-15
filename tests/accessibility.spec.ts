// axe on every page at phone and desktop sizes. Serious or critical issues fail
// the check (the Final QA bar); minor and moderate ones are listed as warnings.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { builtPages, missingPage } from './pages';

for (const url of [...builtPages(), missingPage]) {
  test(`axe ${url}`, async ({ page }) => {
    await page.goto(url);
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze();
    const describe = (v: (typeof violations)[number]) =>
      `${v.impact} ${v.id}: ${v.help} (${v.nodes.map((node) => node.target.join(' ')).join(', ')})`;
    const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    for (const v of violations.filter((v) => !blocking.includes(v))) console.warn(`  warning on ${url}: ${describe(v)}`);
    expect(blocking.map(describe)).toEqual([]);
  });
}
