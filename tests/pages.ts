// The pages of the built site, read from dist/, so the checks follow the
// projects as they change.
import { readdirSync } from 'node:fs';
import path from 'node:path';

export const dist = path.join(import.meta.dirname, '..', 'dist');

/** URL paths of every page in dist/, e.g. '/', '/work/', '/work/my-project/'. */
export function builtPages(): string[] {
  return readdirSync(dist, { recursive: true, encoding: 'utf8' })
    .filter((file) => path.basename(file) === 'index.html')
    .map((file) => `/${path.dirname(file).split(path.sep).join('/')}/`.replace('/./', '/'))
    .sort();
}

/** Any address that does not exist, to check the 404 page. */
export const missingPage = '/no-such-page/';
