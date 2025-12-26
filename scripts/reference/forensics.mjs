import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const REFERENCE_URL = 'https://www.hatamex.agency/en';

const VIEWPORTS = [
  { key: 'desktop', width: 1440, height: 900 },
  { key: 'laptop', width: 1280, height: 800 },
  { key: 'tablet', width: 834, height: 1112 },
  { key: 'mobile', width: 390, height: 844 },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function mdEscape(s) {
  return String(s ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ');
}

async function collectForViewport(page, viewport) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(REFERENCE_URL, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForTimeout(3000);

  return await page.evaluate(() => {
    function pickComputed(el, props) {
      if (!el) return null;
      const cs = getComputedStyle(el);
      const out = {};
      for (const prop of props) out[prop] = cs.getPropertyValue(prop);
      return out;
    }

    const root = document.documentElement;
    const rootStyle = getComputedStyle(root);
    const rootVars = Array.from(rootStyle)
      .filter((name) => name.startsWith('--'))
      .map((name) => ({ name, value: rootStyle.getPropertyValue(name).trim() }))
      .filter((x) => x.value);

    const body = document.body;
    const nav = document.querySelector('nav');
    const navInner = nav?.querySelector(':scope > div') ?? null;
    const navRect = nav?.getBoundingClientRect() ?? null;

    const main = document.querySelector('main');
    const sectionEls = main ? Array.from(main.children).filter((el) => el.tagName === 'SECTION') : [];
    const sections = sectionEls.map((el, idx) => {
      const rect = el.getBoundingClientRect();
      const heading = el.querySelector('h1,h2,h3')?.textContent?.trim() ?? null;
      return {
        idx,
        tag: el.tagName.toLowerCase(),
        className: el.className,
        heading,
        rect: {
          top: Math.round(rect.top),
          height: Math.round(rect.height),
        },
        computed: {
          backgroundColor: getComputedStyle(el).backgroundColor,
          color: getComputedStyle(el).color,
          paddingTop: getComputedStyle(el).paddingTop,
          paddingRight: getComputedStyle(el).paddingRight,
          paddingBottom: getComputedStyle(el).paddingBottom,
          paddingLeft: getComputedStyle(el).paddingLeft,
        },
      };
    });

    const stylesheets = Array.from(document.styleSheets)
      .map((s) => s.href)
      .filter(Boolean);

    const typography = {
      body: pickComputed(body, [
        'background-color',
        'color',
        'font-family',
        'font-size',
        'font-weight',
        'line-height',
        'letter-spacing',
      ]),
      h1: pickComputed(document.querySelector('h1'), [
        'color',
        'font-family',
        'font-size',
        'font-weight',
        'line-height',
        'letter-spacing',
      ]),
      h2: pickComputed(document.querySelector('h2'), [
        'color',
        'font-family',
        'font-size',
        'font-weight',
        'line-height',
        'letter-spacing',
      ]),
      p: pickComputed(document.querySelector('p'), [
        'color',
        'font-family',
        'font-size',
        'font-weight',
        'line-height',
        'letter-spacing',
        'text-transform',
      ]),
    };

    const navComputed = {
      nav: pickComputed(nav, ['position', 'top', 'left', 'right', 'width', 'height']),
      navRect: navRect
        ? { width: Math.round(navRect.width), height: Math.round(navRect.height), top: Math.round(navRect.top) }
        : null,
      container: pickComputed(navInner, [
        'background-color',
        'border-bottom-color',
        'border-bottom-width',
        'padding-left',
        'padding-right',
        'backdrop-filter',
      ]),
    };

    const footer = document.querySelector('footer');
    const footerText = footer?.innerText?.trim() ?? null;

    const navLinks = Array.from(document.querySelectorAll('nav a'))
      .map((a) => ({ text: a.textContent.trim(), href: a.getAttribute('href') }))
      .filter((x) => x.text);

    return {
      url: location.href,
      title: document.title,
      stylesheets,
      rootVars,
      typography,
      nav: navComputed,
      navLinks,
      sections,
      footerText,
    };
  });
}

function writeGlobalDocs({ desktopData }) {
  const outDir = path.join('docs', 'forensics');
  ensureDir(outDir);

  const rootVar = (name) => desktopData.rootVars.find((v) => v.name === name)?.value ?? 'TBD';
  const t = desktopData.typography;
  const nav = desktopData.nav;

  const lines = [];
  lines.push('# Global Forensics (Hatamex /en)');
  lines.push('');
  lines.push('Evidence sources:');
  lines.push(`- Live computed styles via Playwright on ${REFERENCE_URL}`);
  lines.push(`- Loaded stylesheets: ${desktopData.stylesheets.join(', ')}`);
  lines.push('');

  lines.push('## Token Inventory (extracted)');
  lines.push('');
  lines.push('| Token | Value | Evidence |');
  lines.push('|---|---|---|');
  lines.push(`| --color-accent | ${mdEscape(rootVar('--color-accent'))} | :root computed var |`);
  lines.push(`| --color-background | ${mdEscape(rootVar('--color-background'))} | :root computed var |`);
  lines.push(`| --color-container | ${mdEscape(rootVar('--color-container'))} | :root computed var |`);
  lines.push(`| --color-nav-darker-container | ${mdEscape(rootVar('--color-nav-darker-container'))} | :root computed var |`);
  lines.push(`| --color-gray-text | ${mdEscape(rootVar('--color-gray-text'))} | :root computed var |`);
  lines.push(`| --color-gray-text-2 | ${mdEscape(rootVar('--color-gray-text-2'))} | :root computed var |`);
  lines.push(`| --color-nav-text | ${mdEscape(rootVar('--color-nav-text'))} | :root computed var |`);
  lines.push(`| --color-gray-border | ${mdEscape(rootVar('--color-gray-border'))} | :root computed var |`);
  lines.push(`| --default-transition-duration | ${mdEscape(rootVar('--default-transition-duration'))} | :root computed var |`);
  lines.push(`| --default-transition-timing-function | ${mdEscape(rootVar('--default-transition-timing-function'))} | :root computed var |`);
  lines.push('');

  lines.push('## Container / Grid (desktop snapshot)');
  lines.push('');
  lines.push(`- Nav container padding-left/right: ${nav.container?.['padding-left'] ?? 'TBD'} / ${nav.container?.['padding-right'] ?? 'TBD'}`);
  lines.push(`- Nav height: ${nav.navRect?.height ?? 'TBD'}px (computed via getBoundingClientRect)`);
  lines.push('');

  lines.push('## Typography Map (desktop snapshot)');
  lines.push('');
  lines.push(`- Body: ${t.body?.['font-family'] ?? 'TBD'} / ${t.body?.['font-size'] ?? 'TBD'} / ${t.body?.['line-height'] ?? 'TBD'}`);
  lines.push(`- H1: ${t.h1?.['font-family'] ?? 'TBD'} / ${t.h1?.['font-size'] ?? 'TBD'} / ls ${t.h1?.['letter-spacing'] ?? 'TBD'}`);
  lines.push(`- H2: ${t.h2?.['font-family'] ?? 'TBD'} / ${t.h2?.['font-size'] ?? 'TBD'} / ls ${t.h2?.['letter-spacing'] ?? 'TBD'}`);
  lines.push(`- Paragraph: ${t.p?.['font-family'] ?? 'TBD'} / ${t.p?.['font-size'] ?? 'TBD'} / ls ${t.p?.['letter-spacing'] ?? 'TBD'}`);
  lines.push('');

  fs.writeFileSync(path.join(outDir, 'global.md'), lines.join('\n') + '\n');
}

function writeHomeDocs({ desktopData }) {
  ensureDir(path.join('docs', 'forensics'));

  const homeLines = [];
  homeLines.push('# Homepage Forensics (Hatamex /en)');
  homeLines.push('');
  homeLines.push('## IA map (section order)');
  homeLines.push('');
  desktopData.sections.forEach((s, i) => {
    const label = s.heading ? s.heading : `Section ${String(i + 1).padStart(2, '0')}`;
    homeLines.push(`${String(i + 1).padStart(2, '0')}. ${label}`);
  });
  homeLines.push('');
  homeLines.push('## Nav links (top nav)');
  homeLines.push('');
  desktopData.navLinks.forEach((l) => homeLines.push(`- ${l.text} → ${l.href}`));
  homeLines.push('');
  homeLines.push('## Footer (text extract)');
  homeLines.push('');
  homeLines.push(desktopData.footerText ?? 'TBD');
  homeLines.push('');
  fs.writeFileSync(path.join('docs', 'forensics', 'home.md'), homeLines.join('\n') + '\n');

  const invLines = [];
  invLines.push('# Sections Inventory (Hatamex /en)');
  invLines.push('');
  desktopData.sections.forEach((s, i) => {
    const name = s.heading ? s.heading : `Trusted by innovators worldwide`;
    invLines.push(`${String(i + 1).padStart(2, '0')}) ${name}`);
    invLines.push('- Purpose: TBD');
    invLines.push('- Key elements: TBD');
    invLines.push('- Responsive notes: TBD');
    invLines.push('- Motion notes (trigger + properties): TBD');
    invLines.push('- Editable fields (client-safe edits): headings, copy, links');
    invLines.push('');
  });
  fs.writeFileSync(path.join('docs', 'sections-inventory.md'), invLines.join('\n') + '\n');
}

async function main() {
  ensureDir(path.join('docs', 'forensics', 'raw'));

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const all = {};
  for (const viewport of VIEWPORTS) {
    const data = await collectForViewport(page, viewport);
    all[viewport.key] = data;
    fs.writeFileSync(
      path.join('docs', 'forensics', 'raw', `reference-${viewport.key}.json`),
      JSON.stringify(data, null, 2) + '\n'
    );
  }

  await browser.close();

  writeGlobalDocs({ desktopData: all.desktop });
  writeHomeDocs({ desktopData: all.desktop });

  // Sections map scaffold (source of truth once implementation starts).
  ensureDir('docs');
  const mapPath = path.join('docs', 'sections-map.md');
  if (!fs.existsSync(mapPath)) {
    const lines = [];
    lines.push('# Sections Map');
    lines.push('');
    lines.push('| SectionName | Pattern file | Used on | Editable fields | Variants | Notes |');
    lines.push('|---|---|---|---|---|---|');
    all.desktop.sections.forEach((s, i) => {
      const name = s.heading ? s.heading : 'Trusted by innovators worldwide';
      const nn = String(i + 1).padStart(2, '0');
      lines.push(
        `| ${mdEscape(name)} | wp-content/themes/lucid-hatamex-clone-theme/patterns/${nn}-TBD.php | /en/ | headings, copy, links | - | - |`
      );
    });
    fs.writeFileSync(mapPath, lines.join('\n') + '\n');
  }
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});
