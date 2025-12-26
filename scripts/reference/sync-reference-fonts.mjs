import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function write(filePath, contents) {
  fs.writeFileSync(filePath, contents);
}

async function download(url, outPath) {
  const attempts = 4;
  let lastErr = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      ensureDir(path.dirname(outPath));
      await pipeline(res.body, fs.createWriteStream(outPath));
      return;
    } catch (err) {
      lastErr = err;
      const waitMs = 350 * 2 ** i;
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw new Error(`Failed to download ${url} (${lastErr?.message ?? 'unknown error'})`);
}

async function main() {
  const repoRoot = process.cwd();
  const themeDir = path.join(repoRoot, 'wp-content', 'themes', 'lucid-hatamex-clone-theme');
  const cssPath = path.join(themeDir, 'assets', 'css', 'reference.css');
  const fontsDir = path.join(themeDir, 'assets', 'fonts');

  if (!fs.existsSync(cssPath)) throw new Error(`Missing ${cssPath}`);

  const css = read(cssPath);
  const matches = [...css.matchAll(/https:\/\/www\.hatamex\.agency\/_next\/static\/media\/[^\)\"']+?\.woff2/g)];
  const urls = [...new Set(matches.map((m) => m[0]))];

  if (!urls.length) {
    process.stdout.write('No remote .woff2 URLs found in reference.css\n');
    return;
  }

  for (const url of urls) {
    const filename = url.split('/').pop();
    const outPath = path.join(fontsDir, filename);
    if (!fs.existsSync(outPath)) {
      process.stdout.write(`Downloading ${filename}...\n`);
      await download(url, outPath);
    }
  }

  const rewritten = urls.reduce((next, url) => {
    const filename = url.split('/').pop();
    return next.replaceAll(url, `../fonts/${filename}`);
  }, css);

  if (rewritten !== css) {
    write(cssPath, rewritten);
    process.stdout.write(`Rewrote font URLs in ${path.relative(repoRoot, cssPath)}\n`);
  }

  process.stdout.write(`Synced ${urls.length} fonts → ${path.relative(repoRoot, fontsDir)}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
