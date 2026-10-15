// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // The deploy workflow (.github/workflows/deploy.yml) sets both from the
  // repo's owner and name, so the site keeps working after a repo transfer.
  // Locally the site sits at the root of the preview.
  site: process.env.SITE_URL ?? 'http://localhost:4321',
  base: process.env.BASE_PATH ?? '/',
  integrations: [mdx(), sitemap()],
  // The site's CSS is small (about 8 KB), so each page carries it inline
  // instead of waiting on a separate file before it can draw anything.
  build: { inlineStylesheets: 'always' },
  // Keep the dev preview identical to the built site for design reviews.
  devToolbar: { enabled: false },
});
