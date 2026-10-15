// Site paths with the base path in front, so every link keeps working if the
// site is served from a subfolder (GitHub Pages serves a repo named `site` at
// /site/). While the site sits at the root, url('/work/') is just '/work/'.
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export const url = (path: string) => `${base}${path}`;
