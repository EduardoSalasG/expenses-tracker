import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const repositoryRoot = resolve(import.meta.dirname, '..');
const publicSiteSource = resolve(repositoryRoot, 'frontend/src/environments/public-site.ts');
const publicDirectory = resolve(repositoryRoot, 'frontend/public');
const source = await readFile(publicSiteSource, 'utf8');
const match = source.match(/productionPublicSiteUrl = '([^']+)'/);

if (!match) {
  throw new Error(`Unable to read productionPublicSiteUrl from ${publicSiteSource}.`);
}

const siteUrl = new URL(match[1]);
if (siteUrl.hostname === 'example.com' || siteUrl.hostname.includes('placeholder')) {
  throw new Error(`Refusing to generate discovery resources from placeholder URL: ${siteUrl}`);
}

const canonicalRoot = siteUrl.toString().replace(/\/$/, '');
await writeFile(resolve(publicDirectory, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /login\nDisallow: /dashboard\nDisallow: /expenses\nDisallow: /incomes\nDisallow: /budgets\nDisallow: /categories\nDisallow: /settings\nSitemap: ${canonicalRoot}/sitemap.xml\n`);
await writeFile(resolve(publicDirectory, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n  <url>\n    <loc>${canonicalRoot}/</loc>\n    <xhtml:link rel="alternate" hreflang="es" href="${canonicalRoot}/"/>\n    <xhtml:link rel="alternate" hreflang="en" href="${canonicalRoot}/en"/>\n    <xhtml:link rel="alternate" hreflang="x-default" href="${canonicalRoot}/"/>\n  </url>\n  <url>\n    <loc>${canonicalRoot}/en</loc>\n    <xhtml:link rel="alternate" hreflang="es" href="${canonicalRoot}/"/>\n    <xhtml:link rel="alternate" hreflang="en" href="${canonicalRoot}/en"/>\n    <xhtml:link rel="alternate" hreflang="x-default" href="${canonicalRoot}/"/>\n  </url>\n</urlset>\n`);
