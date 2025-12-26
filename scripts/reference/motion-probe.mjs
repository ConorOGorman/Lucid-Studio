import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const REFERENCE_URL = 'https://www.hatamex.agency/en';
const OUT_PATH = path.resolve('docs/forensics/raw/motion-probe.json');

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

async function dismissCookieNoticeIfPresent(page) {
  try {
    const submit = page.getByRole('button', { name: 'SUBMIT ONLY NECESSARY COOKIES' });
    const agree = page.getByRole('button', { name: 'I AGREE' });
    const reject = page.getByRole('button', { name: 'REJECT ALL COOKIES' });

    if (await submit.count()) await submit.first().click({ timeout: 2000 });
    else if (await reject.count()) await reject.first().click({ timeout: 2000 });
    else if (await agree.count()) await agree.first().click({ timeout: 2000 });
    else return;

    await page.waitForTimeout(250);
  } catch {
    // ignore
  }
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(120_000);

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(REFERENCE_URL, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForTimeout(1500);
  await dismissCookieNoticeIfPresent(page);

  const result = await page.evaluate(async () => {
    const probe = {
      url: location.href,
      ts: new Date().toISOString(),
      letterReveal: {
        atLoad: null,
        afterScroll: null,
      },
      activeAnimations: [],
    };

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const toMs = (value) => {
      const raw = String(value || '').trim();
      if (!raw) return 0;
      if (raw.endsWith('ms')) return Number.parseFloat(raw.slice(0, -2));
      if (raw.endsWith('s')) return Number.parseFloat(raw.slice(0, -1)) * 1000;
      return Number.parseFloat(raw);
    };

    const services = document.querySelector('section[data-slice-type="services_overview"]');
    if (services) {
      const heading = services.querySelector('p.flex');
      const overlaySpans = heading ? Array.from(heading.querySelectorAll('span.absolute + span')).slice(0, 300) : [];

      const sampleOverlays = async (label) => {
        const samples = [];
        const start = performance.now();

        for (const stepMs of [0, 50, 100, 150, 200, 300, 400, 600, 900, 1200, 1600]) {
          const now = performance.now();
          const delay = Math.max(0, stepMs - (now - start));
          if (delay) await sleep(delay);

          const entries = overlaySpans.slice(0, 40).map((el) => {
            const cs = getComputedStyle(el);
            return {
              text: el.textContent || '',
              styleOpacity: el.style.opacity || null,
              opacity: Number.parseFloat(cs.opacity || '0'),
              transitionDurationMs: toMs(cs.transitionDuration),
              transitionDelayMs: toMs(cs.transitionDelay),
              transitionProperty: cs.transitionProperty,
              animationName: cs.animationName,
            };
          });

          samples.push({ tMs: Math.round(performance.now() - start), entries });
        }

        return {
          label,
          overlayCount: overlaySpans.length,
          headingTextPreview: heading ? (heading.textContent || '').slice(0, 80) : null,
          samples,
        };
      };

      probe.letterReveal.atLoad = await sampleOverlays('atLoad');

      services.scrollIntoView({ block: 'start', inline: 'nearest' });
      await sleep(250);
      probe.letterReveal.afterScroll = await sampleOverlays('afterScroll');
    }

    // Capture any in-flight animations after the scroll jump.
    const animations = document.getAnimations?.() ?? [];
    probe.activeAnimations = animations
      .map((anim) => {
        const target = anim.effect?.target;
        if (!(target instanceof Element)) return null;
        const frames = anim.effect?.getKeyframes?.() ?? [];
        const props = new Set();
        for (const frame of frames) {
          for (const key of Object.keys(frame)) {
            if (key === 'offset' || key === 'easing' || key === 'composite') continue;
            props.add(key);
          }
        }
        return {
          target: {
            tag: target.tagName.toLowerCase(),
            id: target.id || null,
            class: typeof target.className === 'string' ? target.className : null,
            slice: target.closest('section[data-slice-type]')?.getAttribute('data-slice-type') ?? null,
          },
          properties: Array.from(props),
          timing: anim.effect?.getTiming?.() ?? null,
        };
      })
      .filter(Boolean);

    return probe;
  });

  ensureDir(OUT_PATH);
  fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2));

  await browser.close();
  // eslint-disable-next-line no-console
  console.log(`Wrote ${OUT_PATH}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
