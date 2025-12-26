import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const VIEWPORTS = [
  { key: 'desktop', width: 1440, height: 900 },
  { key: 'laptop', width: 1280, height: 800 },
  { key: 'tablet', width: 834, height: 1112 },
  { key: 'mobile', width: 390, height: 844 },
];

const TRANSPARENT_PNG_1X1_BASE64 =
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=';

function parseArgs(argv) {
  const out = {};
  for (const arg of argv.slice(2)) {
    if (!arg.startsWith('--')) continue;
    const [k, v] = arg.slice(2).split('=');
    out[k] = v === undefined ? true : v;
  }
  return out;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function main() {
  const args = parseArgs(process.argv);
  const url = args.url;
  const outDir = args.outDir;
  const waitMs = Number(args.waitMs ?? 6000);
  const isReference = typeof url === 'string' && url.includes('hatamex.agency');

  if (!url) throw new Error('Missing required arg: --url=');
  if (!outDir) throw new Error('Missing required arg: --outDir=');

  ensureDir(outDir);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.setDefaultTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });

  // Asset policy: placeholders-only → avoid downloading imagery/video during reference capture.
  await page.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (type === 'image') {
      const body = Buffer.from(TRANSPARENT_PNG_1X1_BASE64, 'base64');
      return route.fulfill({
        status: 200,
        contentType: 'image/png',
        body,
      });
    }
    if (type === 'media') {
      return route.fulfill({ status: 204, body: '' });
    }
    return route.continue();
  });

  async function waitForReady() {
    await page.waitForFunction(
      (isRef) => {
        const heroH1 =
          document.querySelector('main h1') ||
          document.querySelector('.lucid-h1') ||
          document.querySelector('h1');
        if (!heroH1) return false;
        const heroRect = heroH1.getBoundingClientRect();
        const heroVisible = heroRect.height > 0 && heroRect.width > 0;
        if (!heroVisible) return false;

        if (!isRef) {
          // Ensure line-splitting has applied before capture (affects wrapping at tablet/mobile).
          // Undefined => older builds; treat as ready.
          // false => still running; wait.
          // true => ready.
          // eslint-disable-next-line no-underscore-dangle
          if (window.__lucid_line_split_ready === false) return false;
          return true;
        }

        const fixedDivs = Array.from(document.querySelectorAll('div.fixed'));
        const loader = fixedDivs.find(
          (el) =>
            typeof el.className === 'string' &&
            el.className.includes('top-0') &&
            el.className.includes('left-0') &&
            el.className.includes('w-full') &&
            el.className.includes('h-[100dvh]') &&
            el.className.includes('z-[100]')
        );
        if (!loader) return true;
        const cs = getComputedStyle(loader);
        return cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0';
      },
      isReference,
      { timeout: 60_000 }
    );
  }

  async function dismissCookieNoticeIfPresent() {
    try {
      const submit = page.getByRole('button', { name: 'SUBMIT ONLY NECESSARY COOKIES' });
      const agree = page.getByRole('button', { name: 'I AGREE' });
      const reject = page.getByRole('button', { name: 'REJECT ALL COOKIES' });

      if (await submit.count()) await submit.first().click({ timeout: 2000 });
      else if (await reject.count()) await reject.first().click({ timeout: 2000 });
      else if (await agree.count()) await agree.first().click({ timeout: 2000 });
      else return;

      await page.waitForTimeout(250);
      await page.waitForFunction(() => !document.body.innerText.includes('We use cookies'), { timeout: 10_000 });
    } catch {
      // Ignore failures (banner may not exist or may have different copy).
    }
  }

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.waitForTimeout(waitMs);
    await waitForReady();
    await dismissCookieNoticeIfPresent();

    // Deterministic screenshots: freeze motion so marquees/reveals don't drift between reference and build.
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

    // Force line-split text into its final/static state for pixel comparisons.
    await page.addStyleTag({
      content: ['.line{transform:translate3d(0px,0%,0px)!important}'].join('\n'),
    });

    if (!isReference) {
      await page.addStyleTag({
        content: [
          '#wpadminbar{display:none!important}',
          'html{margin-top:0!important}',
          'body{margin-top:0!important}',
        ].join('\n'),
      });
    }

    await page.waitForTimeout(200);
    await page.screenshot({
      path: path.join(outDir, `${vp.key}.png`),
      fullPage: true,
    });
  }

  await browser.close();
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});
