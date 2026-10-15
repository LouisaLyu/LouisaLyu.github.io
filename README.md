# Portfolio website

This website uses Astro. Node.js and npm are required; Python and Conda are optional helpers, not required to run the website. npm keeps the project's packages in its local `node_modules` directory.

## Run on Windows

Open PowerShell in this project folder. Install the exact package versions from the lockfile:

```powershell
npm.cmd ci
```

Start the development server:

```powershell
npm.cmd run dev
```

Open the local URL printed by Astro (normally http://localhost:4321). Press Ctrl+C to stop the server. Using `npm.cmd` avoids PowerShell script execution policy issues.

## Editing the text

All the words on the site are in Markdown files in `src/content/`. Start the development server (above); every save shows on http://localhost:4321 within a second.

- **Pages:** one file each in `src/content/text/`. The comments (lines starting with `#`) say what each line is.
  - `site.md`: your name, the tagline under it, the footer word, the email and links.
  - `home.md`, `about.md`, `work.md`, `contact.md`, `not-found.md` (the 404 page).
  - `philosophy.md`: the design philosophy, shown on About: the full text below the second `---`, as plain paragraphs.
  - `project-page.md`: the labels every project page shares (See the process, Role, Dates…).
  - The skills list is in `about.md`; projects must use its names.
- **Projects:** one file each in `src/content/projects/` (`beyond-pure-digital.mdx`, `daily-weather-comparison.mdx`). The block between the two `---` lines holds the short fields: title, description, dates, tools, skills and the intro. Below it is the process in Markdown: `## Goal` starts a section, a blank line starts a paragraph, `*title*` sets italics. Leave the `import` lines and the `<Figure>`, `<Video>`, `<Gallery>` and `<Step>` tags in place, except their `alt` and `caption` text. A file whose name starts with `_` is not on the site; copy `_template.mdx` to start a new project.

Between the `---` lines, keep the spaces at the start of indented lines, and put text in "quotes" if it contains a colon. If something is wrong, the build or the preview stops and names the file. After changing the name or the tagline, run `npm.cmd run share-image` to remake the link-preview image. If a change stops showing on the preview, stop the server, delete `.astro/data-store.json` and start it again.

## Build and preview

```powershell
npm.cmd run build
npm.cmd run preview
```

## Optional Conda environment

If Conda is installed, `environment.yml` provides an isolated Node.js runtime and Python image/PDF helpers:

```powershell
conda env create -f environment.yml
conda activate portfolio
npm.cmd ci
npm.cmd run dev
```

## Checks

Build first, then check the built site:

```powershell
npm.cmd run build
npm.cmd run qa           # axe accessibility scan, links and anchors, media budgets (390 and 1440 px)
npm.cmd run lighthouse   # Lighthouse scores for every page, as a phone and on a desktop
```

To check the live site instead, give its address:

```powershell
$env:BASE_URL = 'https://example.com'; npm.cmd run qa
npm.cmd run lighthouse -- https://example.com
```

The checks and the optional screenshot script need Playwright's Chromium browser, installed with `npx.cmd playwright install chromium`.
