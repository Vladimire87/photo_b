import { readdirSync, mkdirSync, writeFileSync } from 'node:fs';

const issuesDir = new URL('../src/data/issues/', import.meta.url);
const distDir = new URL('../dist/', import.meta.url);
const baseUrl = 'https://photob.pages.dev';

const issueSlugs = readdirSync(issuesDir)
  .map((name) => name.match(/^([0-9]{4}-[0-9]{2})\.txt$/)?.[1])
  .filter(Boolean)
  .sort();
const latestSlug = issueSlugs.at(-1);

const paths = [
  '/',
  '/?view=collections',
  '/?view=about',
  ...issueSlugs.filter((slug) => slug !== latestSlug).map((slug) => `/?issue=${slug}`),
];

const urls = paths
  .map((path) => `  <url>\n    <loc>${baseUrl}${path === '/' ? '/' : path}</loc>\n  </url>`)
  .join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

mkdirSync(distDir, { recursive: true });
writeFileSync(new URL('sitemap.xml', distDir), sitemap);
console.log(`Wrote dist/sitemap.xml with ${paths.length} URLs.`);