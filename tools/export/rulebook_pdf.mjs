/**
 * Rebuilds the rulebook PDFs in public/pdf/ from the rulebook page of the built site, so the
 * downloads always say the same as the website.
 *
 *   npm run build
 *   node tools/export/rulebook_pdf.mjs
 *
 * Needs Playwright with Chromium (`require('playwright')` must resolve) and pdftotext (poppler-utils).
 * The cover and the "In the box" back page are kept from the current PDF of each size; everything
 * between them (contents page and rules) is printed fresh from dist/, then page numbers are stamped
 * and the booklet versions are imposed.
 */
import { createServer } from 'node:http';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DIST = join(ROOT, 'dist/secret-hitler-xl/browser');
const PDF = join(ROOT, 'public/pdf');
const MM = 72 / 25.4;

/** Each reading version, and the booklet it is folded into. */
const SIZES = [
  { name: 'A4', format: 'A4', scale: 0.9, booklet: 'A4_booklet_on_A3' },
  { name: 'A5', format: 'A5', scale: 0.85, booklet: 'A5_booklet_on_A4' },
];

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.pdf': 'application/pdf' };

function serve() {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = join(DIST, path.endsWith('/') ? path + 'index.html' : path);
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();

/** The contents page, put in front of the rules. `pages` maps a contents entry to its page number. */
function contentsHtml(entries, pages) {
  const row = (e) => `<div class="r ${e.kind}"><span>${e.label}</span>${e.players ? `<em>${e.players}</em>` : ''}<b>${pages[e.key] ?? '00'}</b></div>`;
  return `
    <section class="pdf-contents">
      <h1>Contents</h1>
      <p>Part One is the original game for 5 to 10 players, complete on its own. Part Two adds the Secret Hitler XL expansion for 6 to 19 players.</p>
      ${entries.map(row).join('')}
    </section>
    <style>
      .print-head { display: none !important; }
      .pdf-contents { break-after: page; }
      .pdf-contents h1 { margin: 0 0 4mm; }
      .pdf-contents p { margin: 0 0 8mm; color: #6b6a63; }
      .pdf-contents .r { display: flex; align-items: baseline; gap: 3mm; padding: 1.6mm 0 1.6mm 6mm; border-bottom: 1px solid #e3dcc6; }
      .pdf-contents .r span { flex: 1; }
      .pdf-contents .r em { font-style: normal; color: #6b6a63; font-size: .9em; }
      .pdf-contents .r b { min-width: 8mm; text-align: right; }
      .pdf-contents .part { margin-top: 7mm; padding-left: 0; border-bottom: 2px solid #2b2c2a; font-family: var(--display); font-size: 1.45em; }
    </style>`;
}

async function printRules(page, size, pages) {
  await page.evaluate((html) => {
    document.querySelector('.pdf-contents-host')?.remove();
    const host = document.createElement('div');
    host.className = 'pdf-contents-host';
    host.innerHTML = html;
    document.querySelector('article.rules').prepend(host);
  }, contentsHtml(await entries(page), pages));
  return page.pdf({ format: size.format, scale: size.scale, printBackground: true, preferCSSPageSize: false });
}

let cachedEntries;
async function entries(page) {
  cachedEntries ??= await page.evaluate(() => {
    // heading text without the "#" section links next to it
    const tx = (el) => { const c = el.cloneNode(true); c.querySelectorAll('.anchor').forEach((a) => a.remove()); return c.textContent.trim(); };
    return [...document.querySelectorAll('article.rules .blk')].flatMap((blk) => {
      const part = blk.querySelector(':scope > header.part');
      if (part) {
        const sub = part.querySelector('p')?.textContent ?? '';
        return [{ kind: 'part', key: tx(part.querySelector('h1')), label: tx(part.querySelector('h1')),
          find: part.querySelector('.num').textContent.trim(), players: (sub.match(/^\d+ to \d+ players/) ?? [''])[0] }];
      }
      const h1 = blk.querySelector(':scope > h1');
      if (h1 && h1.id !== 'version-history') return [{ kind: 'h1', key: tx(h1), label: tx(h1).replace(/\s+/, ' '), find: tx(h1) }];
      const cr = blk.querySelector(':scope > .credits h2');
      if (cr) return [{ kind: 'h1', key: tx(cr), label: tx(cr), find: tx(cr) }];
      return [];
    });
  });
  return cachedEntries;
}

/** Finds the page each contents entry starts on (1 = first page of `bytes`), in order. */
async function findPages(bytes, list, offset) {
  const dir = await mkdtemp(join(tmpdir(), 'rb-'));
  try {
    const f = join(dir, 'x.pdf');
    await writeFile(f, bytes);
    const text = execFileSync('pdftotext', ['-layout', f, '-'], { encoding: 'utf8' }).split('\f').map(norm);
    const out = {};
    let from = 1;   // skip the contents page itself
    for (const e of list) {
      const needle = norm(e.find);
      // a part always starts a page, with its letter-spaced label ("PART ONE") on top
      const flat = needle.replace(/ /g, '');
      const hit = e.kind === 'part' ? (t) => t.replace(/ /g, '').startsWith(flat) : (t) => t.includes(needle);
      const i = text.findIndex((t, k) => k >= from && hit(t));
      if (i < 0) throw new Error('not found in the PDF: ' + e.find);
      out[e.key] = i + 1 + offset;
      from = i;
    }
    return out;
  } finally {
    await rm(dir, { recursive: true });
  }
}

/** Cover + fresh pages + back page, with page numbers on every page between them. */
async function assemble(oldBytes, interiorBytes, font) {
  const old = await PDFDocument.load(oldBytes);
  const inner = await PDFDocument.load(interiorBytes);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const jost = await doc.embedFont(font);
  const [cover] = await doc.copyPages(old, [0]);
  const [back] = await doc.copyPages(old, [old.getPageCount() - 1]);
  doc.addPage(cover);
  const pages = await doc.copyPages(inner, inner.getPageIndices());
  pages.forEach((p, i) => {
    doc.addPage(p);
    const n = i + 2, { width } = p.getSize(), size = 8, label = 'Secret Hitler + XL', gap = 6;
    const num = String(n), wNum = jost.widthOfTextAtSize(num, size), wLab = jost.widthOfTextAtSize(label, size);
    const y = 8 * MM, x0 = 14 * MM;
    const ink = rgb(0.17, 0.17, 0.16), muted = rgb(0.42, 0.42, 0.39);
    if (n % 2 === 0) {
      p.drawText(num, { x: x0, y, size, font: jost, color: ink });
      p.drawText(label, { x: x0 + wNum + gap, y, size, font: jost, color: muted });
    } else {
      p.drawText(label, { x: width - x0 - wNum - gap - wLab, y, size, font: jost, color: muted });
      p.drawText(num, { x: width - x0 - wNum, y, size, font: jost, color: ink });
    }
  });
  // blank pages before the back page, so the booklet has a multiple of four pages
  const { width, height } = cover.getSize();
  while ((doc.getPageCount() + 1) % 4) doc.addPage([width, height]).drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });   // a page needs content to be embedded
  doc.addPage(back);
  return doc;
}

/** Two pages side by side on a sheet twice as wide, in booklet order, for double-sided printing. */
async function booklet(doc) {
  const src = await PDFDocument.load(await doc.save());
  const out = await PDFDocument.create();
  const n = src.getPageCount();
  const { width, height } = src.getPage(0).getSize();
  const emb = await out.embedPages(src.getPages());
  for (let i = 0; i < n / 2; i++) {
    const [l, r] = i % 2 === 0 ? [n - 1 - i, i] : [i, n - 1 - i];
    const sheet = out.addPage([width * 2, height]);
    sheet.drawPage(emb[l], { x: 0, y: 0 });
    sheet.drawPage(emb[r], { x: width, y: 0 });
  }
  return out;
}

const server = await serve();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await page.goto(`http://127.0.0.1:${server.address().port}/#/rules`);
  await page.waitForSelector('app-role-box h3');
  await page.evaluate(() => Promise.all([...document.querySelectorAll('img')].map((img) => {
    img.loading = 'eager';
    return img.complete ? null : new Promise((ok) => { img.onload = img.onerror = ok; });
  })));
  await page.evaluate(() => document.fonts.ready);
  const font = await readFile(join(ROOT, 'public/fonts/Jost-Medium.ttf'));
  for (const size of SIZES) {
    const list = await entries(page);
    const first = await printRules(page, size, {});
    const pages = await findPages(first, list, 1);   // the cover is page 1
    const interior = await printRules(page, size, pages);
    const check = await findPages(interior, list, 1);
    if (JSON.stringify(check) !== JSON.stringify(pages)) throw new Error('contents page numbers moved, run again');
    const file = (s) => join(PDF, `Secret_Hitler_XL_Rulebook_${s}.pdf`);
    const doc = await assemble(await readFile(file(size.name)), interior, font);
    await writeFile(file(size.name), await doc.save());
    await writeFile(file(size.booklet), await (await booklet(doc)).save());
    console.log(size.name, doc.getPageCount(), 'pages', pages);
  }
} finally {
  await browser.close();
  server.close();
}
