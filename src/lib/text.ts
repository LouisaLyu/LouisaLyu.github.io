// The words on the site live in Markdown files: one per page in
// src/content/text/, and one per project in src/content/projects/.
// These helpers read the page files.
import { getCollection, type CollectionKey } from 'astro:content';

/** One page's text file, e.g. words('home') for src/content/text/home.md. */
export async function words<C extends CollectionKey>(name: C) {
  const [entry] = await getCollection(name);
  if (!entry) throw new Error(`The text file for "${name}" is missing from src/content/text/.`);
  return entry;
}

/** The menu: each page, labelled with the title in its text file. */
export async function menu() {
  const [work, about, contact] = await Promise.all([words('work'), words('about'), words('contact')]);
  return [
    { href: '/work/', label: work.data.title },
    { href: '/about/', label: about.data.title },
    { href: '/contact/', label: contact.data.title },
  ];
}
