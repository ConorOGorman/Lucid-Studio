import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const REFERENCE_URL = 'https://www.hatamex.agency/en';
const TRANSPARENT_PNG_1X1_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=';

const VIEWPORT = { width: 1440, height: 900 };

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, contents) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, contents.endsWith('\n') ? contents : `${contents}\n`);
}

function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replaceAll(/['’]/g, '')
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .slice(0, 60);
}

async function dismissCookies(page) {
  const names = ['SUBMIT ONLY NECESSARY COOKIES', 'REJECT ALL COOKIES', 'I AGREE'];
  for (const name of names) {
    const btn = page.getByRole('button', { name });
    if (await btn.count()) {
      await btn.first().click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(300);
      break;
    }
  }
}

async function main() {
  const outBase = path.join('docs', 'forensics', 'raw');
  const outSections = path.join(outBase, 'sections-reduce');

  ensureDir(outSections);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });
  page.setDefaultTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });

  // Match screenshot pipeline: enforce placeholders-only without mutating element visibility (which can affect motion state).
  await page.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (type === 'image') {
      const body = Buffer.from(TRANSPARENT_PNG_1X1_BASE64, 'base64');
      return route.fulfill({ status: 200, contentType: 'image/png', body });
    }
    if (type === 'media') return route.fulfill({ status: 204, body: '' });
    return route.continue();
  });

  await page.goto(REFERENCE_URL, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForTimeout(6000);
  await dismissCookies(page);

  // Freeze motion to preserve initial (not-in-view) states for below-fold content.
  await page.addStyleTag({
    content: [
      '*{',
      '  animation-play-state: paused !important;',
      '  transition-duration: 0s !important;',
      '  transition-delay: 0s !important;',
      '}',
      'html{scroll-behavior:auto !important}',
    ].join('\n'),
  });

  await page.evaluate(() => {
    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(250);

  const extracted = await page.evaluate(() => {
    const nav = document.querySelector('nav');
    const footer = document.querySelector('footer');
    const main = document.querySelector('main');
    const sections = main ? Array.from(main.querySelectorAll(':scope > section')) : [];

    return {
      nav: nav?.outerHTML ?? null,
      footer: footer?.outerHTML ?? null,
      sections: sections.map((section, idx) => {
        const type = section.getAttribute('data-slice-type') || `section-${idx + 1}`;
        const heading = section.querySelector('h1,h2,h3')?.textContent?.trim() ?? '';
        return { idx, type, heading, html: section.outerHTML };
      }),
    };
  });

  if (!extracted.nav) throw new Error('Failed to extract <nav> markup from reference.');
  if (!extracted.footer) throw new Error('Failed to extract <footer> markup from reference.');
  if (!extracted.sections.length) throw new Error('Failed to extract <main> section markup from reference.');

  write(path.join(outBase, 'reference-nav-desktop-reduce.html'), extracted.nav);
  write(path.join(outBase, 'reference-footer-desktop-reduce.html'), extracted.footer);

  // Clear previous sections to avoid stale files.
  for (const file of fs.readdirSync(outSections)) {
    if (file.startsWith('reference-') && file.endsWith('.html')) {
      fs.unlinkSync(path.join(outSections, file));
    }
  }

  for (const s of extracted.sections) {
    const nn = String(s.idx + 1).padStart(2, '0');
    const slug = slugify(s.type || s.heading || `section-${nn}`) || `section-${nn}`;
    const fileName = `reference-${nn}-${slug}.html`;
    write(path.join(outSections, fileName), s.html);
  }

  await browser.close();

  process.stdout.write(`Extracted reference markup → ${outBase}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
