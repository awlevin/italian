#!/usr/bin/env node
/* ---------------------------------------------------------------
   Ponte — brand asset renderer.

     node assets/brand/render.mjs        (or: pnpm brand)

   Each picture is an HTML page in this folder, laid out at its exact
   export size, or the one icon source, icon.svg. This script serves
   the folder over http, screenshots each page with Playwright, draws
   every icon size from icon.svg, packs favicon.ico, and then checks
   the dimensions of everything it wrote.

   A palette change is an edit to brand.css + icon.svg and a re-run.
   No network needed: the fonts are vendored in ./fonts.
   --------------------------------------------------------------- */

import { createServer } from 'node:http';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const REPO = resolve(HERE, '../..');

/** HTML pages: source, export size, destination. */
const PAGES = [
  { page: 'banner.html', width: 1280, height: 640, out: 'assets/brand/banner.png' },
  { page: 'og.html', width: 1200, height: 630, out: 'src/app/opengraph-image.png' },
];

/** What the Open Graph image shows, for people who cannot see it. */
const OG_ALT =
  'Ponte: Learn Italian, for Spanish speakers. The Spanish word noche becomes the Italian notte.';

/**
 * Icons drawn from icon.svg.
 *   tile      the rounded tile, transparent corners (browsers, Android "any")
 *   full      square to the edge; iOS rounds the corners itself
 *   maskable  square to the edge, mark shrunk into the 80% safe circle
 */
const ICONS = [
  { variant: 'full', size: 180, out: 'src/app/apple-icon.png' },
  { variant: 'tile', size: 192, out: 'public/icon-192.png' },
  { variant: 'tile', size: 512, out: 'public/icon-512.png' },
  { variant: 'maskable', size: 512, out: 'public/icon-maskable-512.png' },
];
const FAVICON_SIZES = [16, 32, 48];

const FONTS = ['400 40px "Fraunces"', 'italic 400 40px "Fraunces"', '400 40px "Instrument Sans"', '700 40px "JetBrains Mono"'];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

function serve() {
  const server = createServer(async (req, res) => {
    const name = normalize(decodeURIComponent((req.url ?? '/').split('?')[0])).replace(/^[/\\]+/, '');
    const path = join(HERE, name);
    try {
      if (!name || !path.startsWith(HERE) || path.includes(`${sep}..`)) throw new Error('not found');
      const body = await readFile(path);
      res.writeHead(200, { 'content-type': MIME[extname(name)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({ server, port: server.address().port })));
}

/** PNG IHDR is always the first chunk: width at byte 16, height at 20. */
function pngSize(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** One edit to icon.svg; throws if the anchor it relies on has gone. */
function edit(svg, from, to) {
  if (!svg.includes(from)) throw new Error(`icon.svg: expected to find ${from}`);
  return svg.replace(from, to);
}

function iconVariant(svg, variant) {
  if (variant === 'tile') return svg;
  const square = edit(svg, 'rx="112"', 'rx="0"');
  if (variant === 'full') return square;
  return edit(square, '<g id="mark">', '<g id="mark" transform="translate(256 256) scale(.8) translate(-256 -256)">');
}

/** An .ico that holds PNGs, one directory entry per size. */
function ico(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt16LE(1, e + 4); // colour planes
    header.writeUInt16LE(32, e + 6); // bits per pixel
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.data)]);
}

async function main() {
  const { server, port } = await serve();
  const browser = await chromium.launch();
  const results = [];
  const write = async (out, data, want) => {
    const dest = join(REPO, out);
    await mkdir(resolve(dest, '..'), { recursive: true });
    await writeFile(dest, data);
    if (want) results.push({ out, got: pngSize(data), want });
  };

  try {
    for (const a of PAGES) {
      const page = await browser.newPage({ viewport: { width: a.width, height: a.height }, deviceScaleFactor: 1 });
      await page.goto(`http://127.0.0.1:${port}/${a.page}`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const missing = await page.evaluate((fonts) => fonts.filter((f) => !document.fonts.check(f)), FONTS);
      if (missing.length) throw new Error(`${a.page}: fonts did not load: ${missing.join(', ')}`);

      // Nothing may spill out of the frame or wrap where it should not.
      const problems = await page.evaluate(() => {
        const frame = document.getElementById('frame').getBoundingClientRect();
        const out = [];
        for (const el of document.querySelectorAll('#frame *')) {
          const r = el.getBoundingClientRect();
          if (!r.width || getComputedStyle(el).position === 'absolute') continue;
          if (r.left < frame.left || r.top < frame.top || r.right > frame.right || r.bottom > frame.bottom)
            out.push(`${el.tagName.toLowerCase()}.${el.className} leaves the frame`);
        }
        for (const el of document.querySelectorAll('.wordmark, .chip, .es, .it')) {
          // Line boxes of the text alone: decorations like the chip dot sit at other heights.
          const rects = [];
          const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          while (walk.nextNode()) {
            const range = document.createRange();
            range.selectNodeContents(walk.currentNode);
            rects.push(...range.getClientRects());
          }
          const firstBottom = Math.min(...rects.map((r) => r.bottom));
          if (rects.some((r) => r.top >= firstBottom - 1)) out.push(`"${el.textContent.trim()}" wrapped`);
        }
        return out;
      });
      if (problems.length) throw new Error(`${a.page}:\n    ${problems.join('\n    ')}`);

      await write(a.out, await page.locator('#frame').screenshot({ type: 'png' }), a);
      await page.close();
    }
    await writeFile(join(REPO, 'src/app/opengraph-image.alt.txt'), OG_ALT);

    const svg = await readFile(join(HERE, 'icon.svg'), 'utf8');
    await copyFile(join(HERE, 'icon.svg'), join(REPO, 'src/app/icon.svg'));

    const page = await browser.newPage({ deviceScaleFactor: 1 });
    const draw = async (variant, size) => {
      await page.setViewportSize({ width: size, height: size });
      const sized = iconVariant(svg, variant).replace('<svg ', `<svg width="${size}" height="${size}" `);
      await page.setContent(`<body style="margin:0;background:transparent">${sized}</body>`);
      return page.locator('svg').screenshot({ type: 'png', omitBackground: true });
    };
    for (const i of ICONS) await write(i.out, await draw(i.variant, i.size), { width: i.size, height: i.size });

    const favicons = [];
    for (const size of FAVICON_SIZES) {
      const data = await draw('tile', size);
      results.push({ out: `favicon.ico @${size}`, got: pngSize(data), want: { width: size, height: size } });
      favicons.push({ size, data });
    }
    await write('src/app/favicon.ico', ico(favicons));
  } finally {
    await browser.close();
    server.close();
  }

  let bad = 0;
  for (const r of results) {
    const ok = r.got.width === r.want.width && r.got.height === r.want.height;
    if (!ok) bad += 1;
    console.log(
      `  ${ok ? 'ok  ' : 'FAIL'} ${r.out.padEnd(32)} ${r.got.width}×${r.got.height}` +
        (ok ? '' : ` (expected ${r.want.width}×${r.want.height})`),
    );
  }
  console.log('  ok   src/app/icon.svg (copied from assets/brand/icon.svg)');
  console.log('  ok   src/app/opengraph-image.alt.txt');
  if (bad) {
    console.error(`\n${bad} asset(s) have the wrong dimensions.`);
    process.exitCode = 1;
  }
}

await main();
