import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// One MDX file per project in src/content/projects/, with its images in a
// folder of the same name. Files starting with "_" are skipped, so
// _template.mdx can be copied to start a new project.
const projects = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      // One or two sentences for search results and link previews; not shown
      // on the page. Open with the action-verb framing, e.g. "A functional
      // prototype of…".
      description: z.string(),
      kind: z.enum(['investigation', 'problem-solving']),
      year: z.number().int(),
      // What you did, e.g. "Research and design". No team line (Louisa,
      // 2026-10-12).
      role: z.string(),
      // Start to end, e.g. "March 23 – April 13, 2025" or "March 24, 2026 – present".
      dates: z.string(),
      tools: z.array(z.string()),
      // Skills the project shows, listed on its page after Tools. The Work
      // page filters by them. Names come from the list in
      // src/content/text/about.md; the project pages check them as they
      // build, so a misspelt or new name stops the build.
      skills: z.array(z.string()).optional(),
      // A live version people can use, shown as a button beside "See the
      // process", e.g. { href: https://…, label: Try the app }.
      link: z.object({ href: z.string().url(), label: z.string() }).optional(),
      cover: image(),
      coverAlt: z.string(),
      // The graded short introduction: 60–100 words, outcome and "why" first.
      // It is the first text under the cover.
      intro: z.string(),
      // True for the project whose MDX body is the long process outline.
      hasProcess: z.boolean().default(false),
      status: z.enum(['filler', 'draft', 'published']),
      order: z.number().int(),
    }),
});

// The words on every other page: one Markdown file per page in
// src/content/text/ (Louisa, 2026-10-11: "put all into the markdown files").
// Each file is its own small collection, so a missing or misspelt field
// stops the build with the file's name.
const text = (file: string) => glob({ pattern: file, base: './src/content/text' });
const fact = z.object({ label: z.string(), text: z.string(), wide: z.boolean().default(false) });

const site = defineCollection({
  loader: text('site.md'),
  schema: z.object({
    name: z.string(),
    tagline: z.string(),
    wordmark: z.string(),
    description: z.string(),
    email: z.string(),
    links: z.array(z.object({ label: z.string(), href: z.string().url() })),
  }),
});
const home = defineCollection({
  loader: text('home.md'),
  schema: z.object({
    tabTitle: z.string(),
    facts: z.array(fact),
    work: z.object({ title: z.string(), button: z.string() }),
    contact: z.object({ lines: z.array(z.string()).min(1), button: z.string() }),
  }),
});
const philosophy = defineCollection({
  loader: text('philosophy.md'),
  schema: z.object({ title: z.string() }),
});
const about = defineCollection({
  loader: text('about.md'),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    facts: z.array(fact),
    skills: z.object({
      title: z.string(),
      aside: z.string().optional(),
      labels: z.object({ list: z.string(), code: z.string(), tools: z.string() }),
      list: z.array(z.string()).min(1),
      code: z.array(z.string()).default([]),
      tools: z.array(z.string()).default([]),
    }),
  }),
});
const work = defineCollection({
  loader: text('work.md'),
  schema: z.object({ title: z.string(), description: z.string(), intro: z.string(), allFilter: z.string() }),
});
const contact = defineCollection({
  loader: text('contact.md'),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    intro: z.string(),
    phone: z.string(),
    emailLabel: z.string(),
    phoneLabel: z.string(),
    linksLabel: z.string(),
  }),
});
const notFound = defineCollection({
  loader: text('not-found.md'),
  schema: z.object({ title: z.string(), message: z.string(), homeButton: z.string(), workButton: z.string() }),
});
const projectPage = defineCollection({
  loader: text('project-page.md'),
  schema: z.object({
    processButton: z.string(),
    processLabel: z.string(),
    nextLabel: z.string(),
    facts: z.object({ role: z.string(), dates: z.string(), tools: z.string(), skills: z.string() }),
  }),
});

export const collections = { projects, site, home, philosophy, about, work, contact, notFound, projectPage };
