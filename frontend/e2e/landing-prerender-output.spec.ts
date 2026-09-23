import { expect, test } from '@playwright/test';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const browserOutput = resolve(import.meta.dirname, '../dist/frontend/browser');
const netlifyConfig = resolve(import.meta.dirname, '../../netlify.toml');
const publicSiteUrl = 'https://expenses-tracker-easg.netlify.app';

async function renderedLanding(path: string) {
  return readFile(resolve(browserOutput, path), 'utf8');
}

test('el build de producción publica landings prerenderizadas y localizadas', async () => {
  const [spanish, english] = await Promise.all([
    renderedLanding('index.html'),
    renderedLanding('en/index.html')
  ]);

  expect(spanish).toContain('<html lang="es"');
  expect(english).toContain('<html lang="en"');
  expect(spanish).toContain('<h1');
  expect(english).toContain('<h1');
  expect(spanish.match(/<main(?:\s|>)/g)).toHaveLength(1);
  expect(english.match(/<main(?:\s|>)/g)).toHaveLength(1);
  expect(spanish).toContain('Crear cuenta');
  expect(english).toContain('Join now');
  expect(spanish).toContain('href="/login?mode=register"');
  expect(english).toContain('href="/terms"');
  expect(spanish).toContain(`<link rel="canonical" href="${publicSiteUrl}/">`);
  expect(english).toContain(`<link rel="canonical" href="${publicSiteUrl}/en">`);
  expect(spanish).toContain(`<link rel="alternate" href="${publicSiteUrl}/en" hreflang="en">`);
  expect(english).toContain(`<meta property="og:url" content="${publicSiteUrl}/en">`);
  expect(english).toContain('<meta name="twitter:card" content="summary">');
  expect(spanish).not.toContain('example.com');
  expect(english).not.toContain('placeholder');
  await expect(access(resolve(browserOutput, 'dashboard/index.html'))).rejects.toThrow();
});

test('el build conserva recursos de descubrimiento estáticos y canónicos', async () => {
  const [robots, sitemap] = await Promise.all([
    renderedLanding('robots.txt'),
    renderedLanding('sitemap.xml')
  ]);

  expect(robots).toContain(`Sitemap: ${publicSiteUrl}/sitemap.xml`);
  expect(robots).toContain('Disallow: /dashboard');
  expect(sitemap).toContain(`<loc>${publicSiteUrl}/</loc>`);
  expect(sitemap).toContain(`<loc>${publicSiteUrl}/en</loc>`);
  expect(sitemap).toContain('hreflang="x-default"');
});

test('la landing prerenderizada conserva persuasión verificable y opciones públicas', async () => {
  const [spanish, english] = await Promise.all([
    renderedLanding('index.html'),
    renderedLanding('en/index.html')
  ]);

  expect(spanish).toContain('Telegram');
  expect(english).toContain('Telegram');
  expect(spanish).toContain('href="/privacy"');
  expect(english).toContain('href="/terms"');
  expect(spanish).not.toContain('Opiniones de uso real');
  expect(english).not.toContain('Used by real people');
});

test('Netlify normaliza la variante inglesa con barra y fija un runtime compatible', async () => {
  const config = await readFile(netlifyConfig, 'utf8');

  expect(config).toContain('from = "/en/"');
  expect(config).toContain('to = "/en"');
  expect(config).toContain('status = 301');
  expect(config).toContain('NODE_VERSION = "22.22.0"');
});
