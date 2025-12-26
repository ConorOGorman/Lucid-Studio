import fs from 'node:fs';
import path from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const VIEWPORTS = [
  { key: 'desktop', viewportHeight: 900 },
  { key: 'laptop', viewportHeight: 800 },
  { key: 'tablet', viewportHeight: 1112 },
  { key: 'mobile', viewportHeight: 844 },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readPng(filePath) {
  return PNG.sync.read(fs.readFileSync(filePath));
}

function cropPng(png, x, y, w, h) {
  const out = new PNG({ width: w, height: h });
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      const srcIdx = ((y + yy) * png.width + (x + xx)) * 4;
      const dstIdx = (yy * w + xx) * 4;
      out.data[dstIdx] = png.data[srcIdx];
      out.data[dstIdx + 1] = png.data[srcIdx + 1];
      out.data[dstIdx + 2] = png.data[srcIdx + 2];
      out.data[dstIdx + 3] = png.data[srcIdx + 3];
    }
  }
  return out;
}

function diffPair(a, b, outPath) {
  const width = Math.max(a.width, b.width);
  const height = Math.max(a.height, b.height);

  if (a.width !== width || a.height !== height) a = padToSize(a, width, height);
  if (b.width !== width || b.height !== height) b = padToSize(b, width, height);

  const diff = new PNG({ width, height });
  const mismatched = pixelmatch(a.data, b.data, diff.data, width, height, {
    threshold: 0.1,
    includeAA: true,
  });

  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, PNG.sync.write(diff));

  return { mismatched, total: width * height, width, height, a, b };
}

function diffRegion(a, b, region) {
  const ra = cropPng(a, region.x, region.y, region.w, region.h);
  const rb = cropPng(b, region.x, region.y, region.w, region.h);
  const diff = new PNG({ width: region.w, height: region.h });
  const mismatched = pixelmatch(ra.data, rb.data, diff.data, region.w, region.h, {
    threshold: 0.1,
    includeAA: true,
  });
  return { mismatched, total: region.w * region.h };
}

function padToSize(png, width, height) {
  const out = new PNG({ width, height });
  const lastX = Math.max(0, png.width - 1);
  const lastY = Math.max(0, png.height - 1);

  for (let y = 0; y < height; y++) {
    const srcY = y < png.height ? y : lastY;
    for (let x = 0; x < width; x++) {
      const srcX = x < png.width ? x : lastX;
      const srcIdx = (srcY * png.width + srcX) * 4;
      const dstIdx = (y * width + x) * 4;
      out.data[dstIdx] = png.data[srcIdx];
      out.data[dstIdx + 1] = png.data[srcIdx + 1];
      out.data[dstIdx + 2] = png.data[srcIdx + 2];
      out.data[dstIdx + 3] = png.data[srcIdx + 3];
    }
  }
  return out;
}

async function main() {
  const refDir = path.join('docs', 'reference', 'home');
  const buildDir = path.join('docs', 'build', 'home');
  const diffDir = path.join('docs', 'diff', 'home');
  ensureDir(diffDir);

  const summary = {
    overall: {},
    critical: {},
  };

  for (const vp of VIEWPORTS) {
    const refPath = path.join(refDir, `${vp.key}.png`);
    const buildPath = path.join(buildDir, `${vp.key}.png`);
    const outPath = path.join(diffDir, `${vp.key}-diff.png`);

    if (!fs.existsSync(refPath)) throw new Error(`Missing reference screenshot: ${refPath}`);
    if (!fs.existsSync(buildPath)) throw new Error(`Missing build screenshot: ${buildPath}`);

    const a0 = readPng(refPath);
    const b0 = readPng(buildPath);

    const overall = diffPair(a0, b0, outPath);
    summary.overall[vp.key] = {
      mismatched: overall.mismatched,
      total: overall.total,
      percent: (overall.mismatched / overall.total) * 100,
    };

    const a = overall.a;
    const b = overall.b;
    const headerH = Math.min(120, overall.height);
    const heroH = Math.min(vp.viewportHeight, overall.height);
    const footerH = Math.min(400, overall.height);

    const header = diffRegion(a, b, { x: 0, y: 0, w: overall.width, h: headerH });
    const hero = diffRegion(a, b, { x: 0, y: 0, w: overall.width, h: heroH });
    const footer = diffRegion(a, b, {
      x: 0,
      y: overall.height - footerH,
      w: overall.width,
      h: footerH,
    });

    summary.critical[vp.key] = {
      headerTop120: { percent: (header.mismatched / header.total) * 100 },
      heroFirstScreen: { percent: (hero.mismatched / hero.total) * 100 },
      footerArea: { percent: (footer.mismatched / footer.total) * 100 },
    };
  }

  fs.writeFileSync(path.join(diffDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');

  const md = [];
  md.push('# Pixel Diff Summary (Homepage)');
  md.push('');
  md.push('| Viewport | Overall mismatch | Header (top 120px) | Hero (first screen) | Footer (last 400px) |');
  md.push('|---|---:|---:|---:|---:|');
  for (const vp of VIEWPORTS) {
    const o = summary.overall[vp.key];
    const c = summary.critical[vp.key];
    md.push(
      `| ${vp.key} | ${o.percent.toFixed(3)}% | ${c.headerTop120.percent.toFixed(3)}% | ${c.heroFirstScreen.percent.toFixed(
        3
      )}% | ${c.footerArea.percent.toFixed(3)}% |`
    );
  }
  md.push('');
  md.push('Diff images: `docs/diff/home/*-diff.png`');
  md.push('');
  fs.writeFileSync(path.join(diffDir, 'summary.md'), md.join('\n') + '\n');

  // eslint-disable-next-line no-console
  console.log(md.join('\n'));
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});
