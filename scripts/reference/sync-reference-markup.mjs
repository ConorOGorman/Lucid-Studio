import fs from 'node:fs';
import path from 'node:path';

const TRANSPARENT_GIF_1X1 =
  'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function write(filePath, contents) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, contents.endsWith('\n') ? contents : `${contents}\n`);
}

function sanitizeHtml(input) {
  let out = input;

  // Avoid shipping JS-generated line-splitting markup as static HTML.
  // The reference site inserts `.line-mask/.line` wrappers at runtime based on viewport width.
  // When we include that markup directly, browsers can parse/correct it differently (e.g. <div> inside <p>),
  // causing big layout divergence at tablet/mobile. We instead keep plain text + aria-label, and rebuild
  // line masks at runtime in `assets/js/main.js`.
  out = out.replace(
    /<([a-zA-Z][\w:-]*)([^>]*?\saria-label="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g,
    (match, tag, attrs, ariaLabel, inner) => {
      const hasAnySplitMarkup = inner.includes('line-mask') || inner.includes('class="line');
      if (!hasAnySplitMarkup) return match;

      const hasSplitFlag = /\sdata-lucid-split=/.test(attrs);
      let nextAttrs = hasSplitFlag ? attrs : `${attrs} data-lucid-split="1"`;

      // Preserve whether the captured state had the text hidden (translateY(100%)) or visible (translateY(0%)).
      // This lets the build match reference "initial state" when animations are frozen for screenshots.
      const initialHidden =
        inner.includes('transform: translate(0px, 100%') ||
        inner.includes('transform: translate3d(0px, 100%');
      if (!/\sdata-lucid-initial=/.test(nextAttrs)) {
        nextAttrs += ` data-lucid-initial="${initialHidden ? 'hidden' : 'visible'}"`;
      }

      const text = String(ariaLabel)
        .replaceAll('&amp;', '&')
        .replaceAll('&quot;', '"')
        .replaceAll('&#39;', "'")
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>');

      const escaped = text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');

      return `<${tag}${nextAttrs}>${escaped}</${tag}>`;
    }
  );

  // Remove responsive image sources to enforce placeholders-only.
  out = out.replaceAll(/\s+srcset="[^"]*"/g, '');
  out = out.replaceAll(/\s+sizes="[^"]*"/g, '');
  out = out.replaceAll(/\s+data-nimg="[^"]*"/g, '');

  // Replace image sources with a 1x1 transparent placeholder (keeps layout via width/height/classes).
  out = out.replaceAll(/<img([^>]*?)\s+src="https?:\/\/[^"]*"([^>]*)>/g, `<img$1 src="${TRANSPARENT_GIF_1X1}"$2>`);

  // Replace video poster and sources with placeholders (no remote downloads).
  out = out.replaceAll(/\s+poster="https?:\/\/[^"]*"/g, ` poster="${TRANSPARENT_GIF_1X1}"`);
  out = out.replaceAll(/<source([^>]*?)\s+src="https?:\/\/[^"]*"([^>]*)>/g, `<source$1 src=""$2>`);

  return out;
}

function main() {
  const repoRoot = process.cwd();

  const themeDir = path.join(repoRoot, 'wp-content', 'themes', 'lucid-hatamex-clone-theme');
  const outBase = path.join(themeDir, 'assets', 'reference');
  const outSections = path.join(outBase, 'sections');

  const inNav = path.join(repoRoot, 'docs', 'forensics', 'raw', 'reference-nav-desktop-reduce.html');
  const inFooter = path.join(repoRoot, 'docs', 'forensics', 'raw', 'reference-footer-desktop-reduce.html');
  const inSectionsDir = path.join(repoRoot, 'docs', 'forensics', 'raw', 'sections-reduce');

  if (!fs.existsSync(inNav)) throw new Error(`Missing ${inNav}`);
  if (!fs.existsSync(inFooter)) throw new Error(`Missing ${inFooter}`);
  if (!fs.existsSync(inSectionsDir)) throw new Error(`Missing ${inSectionsDir}`);

  write(path.join(outBase, 'nav.html'), sanitizeHtml(read(inNav)));
  write(path.join(outBase, 'footer.html'), sanitizeHtml(read(inFooter)));

  const sectionFiles = fs
    .readdirSync(inSectionsDir)
    .filter((f) => f.endsWith('.html') && f.startsWith('reference-'))
    .sort();

  for (const file of sectionFiles) {
    const match = file.match(/^reference-(\d{2})-/);
    if (!match) continue;
    const nn = match[1];
    write(path.join(outSections, `${nn}.html`), sanitizeHtml(read(path.join(inSectionsDir, file))));
  }

  process.stdout.write(`Synced reference markup → ${path.relative(repoRoot, outBase)}\n`);
}

main();
