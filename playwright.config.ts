// QA checks: `npm run qa` tests the built site (run `npm run build` first) through
// a local preview. Set BASE_URL to test the live site instead, e.g.
//   $env:BASE_URL = 'https://example.com'; npm.cmd run qa
import { defineConfig } from '@playwright/test';

const live = process.env.BASE_URL;

export default defineConfig({
  testDir: 'tests',
  reporter: 'list',
  use: {
    baseURL: live ?? 'http://localhost:4322',
    // Shows scroll-reveal content at once, so every check sees the finished page.
    reducedMotion: 'reduce',
  },
  projects: [
    { name: 'phone', use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } },
  ],
  webServer: live ? undefined : {
    command: 'npm run preview -- --port 4322',
    url: 'http://localhost:4322',
    reuseExistingServer: true,
  },
});
