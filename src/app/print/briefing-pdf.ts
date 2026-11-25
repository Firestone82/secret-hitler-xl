import { PDFFont, PDFImage, PDFPage, RGB, clip, endPath, popGraphicsState, pushGraphicsState, rectangle, rgb, concatTransformationMatrix } from 'pdf-lib';
import { Palette, Role } from '../core/types';

/** Role Briefing card, 63.5 x 88 mm, drawn as vector text from roles.json.
 *  Same layout as the original generator: coloured header with portrait, then labelled bullet sections. */
export const MM = 72 / 25.4;
export const CARD_W = 63.5 * MM, CARD_H = 88 * MM;

export interface BriefingFonts { medium: PDFFont; bold: PDFFont; germania: PDFFont }

export function hex(h: string): RGB {
  const n = parseInt(h.replace('#', ''), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

interface Run { text: string; bold: boolean }
function runs(html: string): Run[] {
  const out: Run[] = [];
  const re = /<b>(.*?)<\/b>/g; let last = 0, m: RegExpExecArray | null;
  const clean = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
  while ((m = re.exec(html))) {
    if (m.index > last) out.push({ text: clean(html.slice(last, m.index)), bold: false });
    out.push({ text: clean(m[1]), bold: true }); last = m.index + m[0].length;
  }
  if (last < html.length) out.push({ text: clean(html.slice(last)), bold: false });
  return out;
}

type Word = { text: string; bold: boolean; space: boolean };
/** Greedy line breaking of rich text; returns lines of words. */
function wrap(html: string, width: number, size: number, f: BriefingFonts): Word[][] {
  const words: Word[] = [];
  for (const r of runs(html)) {
    const parts = r.text.split(/(\s+)/);
    for (const p of parts) {
      if (!p) continue;
      if (/^\s+$/.test(p)) { if (words.length) words[words.length - 1].space = true; continue; }
      words.push({ text: p, bold: r.bold, space: false });
    }
  }
  const lines: Word[][] = []; let line: Word[] = [], w = 0;
  const wOf = (x: Word) => (x.bold ? f.bold : f.medium).widthOfTextAtSize(x.text, size);
  const sp = f.medium.widthOfTextAtSize(' ', size);
  for (const wd of words) {
    const ww = wOf(wd);
    const prevSpace = line.length && line[line.length - 1].space ? sp : 0;
    if (line.length && w + prevSpace + ww > width) { lines.push(line); line = []; w = 0; }
    w += (line.length && line[line.length - 1].space ? sp : 0) + ww; line.push(wd);
  }
  if (line.length) lines.push(line);
  return lines;
}

function drawLines(page: PDFPage, lines: Word[][], x: number, top: number, size: number, leading: number, f: BriefingFonts, color: RGB) {
  const sp = f.medium.widthOfTextAtSize(' ', size);
  lines.forEach((line, i) => {
    let cx = x; const y = top - size - i * leading;
    for (const wd of line) {
      const font = wd.bold ? f.bold : f.medium;
      page.drawText(wd.text, { x: cx, y, size, font, color });
      cx += font.widthOfTextAtSize(wd.text, size) + (wd.space ? sp : 0);
    }
  });
}

function spaced(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number, cs: number, color: RGB) {
  for (const ch of text) { page.drawText(ch, { x, y, size, font, color }); x += font.widthOfTextAtSize(ch, size) + cs; }
}

/** Text squeezed horizontally when it would not fit, never wrapped. */
function oneLine(page: PDFPage, parts: [string, PDFFont, number][], x: number, y: number, maxw: number, color: RGB) {
  const w = parts.reduce((s, [t, f, z]) => s + f.widthOfTextAtSize(t, z), 0);
  const hs = Math.min(1, maxw / w);
  page.pushOperators(pushGraphicsState(), concatTransformationMatrix(hs, 0, 0, 1, x, y));
  let cx = 0;
  for (const [t, f, z] of parts) { page.drawText(t, { x: cx, y: 0, size: z, font: f, color }); cx += f.widthOfTextAtSize(t, z); }
  page.pushOperators(popGraphicsState());
}

/** Draws the card with its lower-left corner at the current origin. bleed in pt is painted around it. */
export function drawBriefing(page: PDFPage, role: Role, pal: Palette, f: BriefingFonts, portrait: PDFImage | null, bleed: number) {
  const W = CARD_W, H = CARD_H, hh = 22.5 * MM;
  const hbg = hex(pal.header), htx = hex(pal.headerText), acc = hex(pal.accent), paper = hex(pal.paper);
  page.drawRectangle({ x: -bleed, y: -bleed, width: W + 2 * bleed, height: H + 2 * bleed, color: paper });
  page.drawRectangle({ x: -bleed, y: H - hh, width: W + 2 * bleed, height: hh + bleed, color: hbg });

  // portrait, cropped around the face
  const ph = hh - 5 * MM, pw = ph * 0.9, px = W - pw - 3.2 * MM, py = H - hh + 2.5 * MM;
  if (portrait) {
    const iw = portrait.width, ih = portrait.height, [cx, cy, cwf] = role.crop;
    const cw = cwf * iw, ch = cw / 0.9;
    const x0 = Math.min(Math.max(cx * iw - cw / 2, 75 * iw / 822), (747 * iw) / 822 - cw);
    const y0 = Math.min(Math.max(cy * ih - ch / 2, 74 * ih / 1122), (1054 * ih) / 1122 - ch);
    const s = ph / ch;
    page.pushOperators(pushGraphicsState(), rectangle(px, py, pw, ph), clip(), endPath());
    page.drawImage(portrait, { x: px - x0 * s, y: py + ph - (ih - y0) * s, width: iw * s, height: ih * s });
    page.pushOperators(popGraphicsState());
  }
  page.drawRectangle({ x: px, y: py, width: pw, height: ph, borderColor: htx, borderWidth: 1 });

  const tx = 3.6 * MM, maxw = px - tx - 2.2 * MM;
  spaced(page, 'YOUR SECRET ROLE', tx, H - 6.0 * MM, f.bold, 5.4, 0.9, htx);
  oneLine(page, [[role.name, f.germania, 17]], tx, H - 13.4 * MM, maxw, htx);
  oneLine(page, [[role.briefing.side, f.bold, 6.3]], tx, H - 17.2 * MM, maxw, htx);
  oneLine(page, [['Membership card: ', f.bold, 5.9], [role.briefing.card, f.medium, 5.9]], tx, H - 20.0 * MM, maxw, htx);

  // sections: labels and bullets, spread over the free height
  const size = 7.6, lead = size * 1.22, labSize = 6.0, labLead = 7.2;
  const top = H - hh - 3.0 * MM, bottom = 2.8 * MM, avail = top - bottom, bw = W - 7.2 * MM - 3.2 * MM;
  const blocks = role.briefing.sections.map((s) => ({ label: s.label, items: s.items.map((it) => wrap(it, bw, size, f)) }));
  let tot = 0;
  for (const b of blocks) { tot += labLead + 0.6 * MM + 1.4 * MM; for (const l of b.items) tot += l.length * lead + 0.7 * MM; }
  const gap = Math.min(3.2 * MM, 1.4 * MM + Math.max(0, avail - tot) / Math.max(blocks.length, 1));
  let y = top;
  const ink = hex('#2b2c2a');
  for (const b of blocks) {
    page.drawText(b.label, { x: tx, y: y - labSize, size: labSize, font: f.bold, color: acc }); y -= labLead + 0.6 * MM;
    for (const lines of b.items) {
      page.drawCircle({ x: tx + 1.0 * MM, y: y - lead * 0.62, size: 0.55 * MM, color: acc });
      drawLines(page, lines, tx + 3.2 * MM, y, size, lead, f, ink); y -= lines.length * lead + 0.7 * MM;
    }
    y -= gap - 0.7 * MM;
  }
  return tot > avail ? (tot - avail) / MM : 0;
}

/** A briefing card with lines to write a role of your own. */
export function drawBlankBriefing(page: PDFPage, pal: Palette, sections: { label: string; lines: number }[], f: BriefingFonts, bleed: number) {
  const W = CARD_W, H = CARD_H, hh = 22.5 * MM;
  const hbg = hex(pal.header), htx = hex(pal.headerText), acc = hex(pal.accent), paper = hex(pal.paper);
  page.drawRectangle({ x: -bleed, y: -bleed, width: W + 2 * bleed, height: H + 2 * bleed, color: paper });
  page.drawRectangle({ x: -bleed, y: H - hh, width: W + 2 * bleed, height: hh + bleed, color: hbg });
  const ph = hh - 5 * MM, pw = ph * 0.95, px = W - pw - 3.2 * MM, py = H - hh + 2.5 * MM;
  page.drawRectangle({ x: px, y: py, width: pw, height: ph, color: paper, borderColor: htx, borderWidth: 1 });
  const tx = 3.6 * MM;
  spaced(page, 'YOUR SECRET ROLE', tx, H - 6.0 * MM, f.bold, 5.4, 0.9, htx);
  const dash = { dashArray: [1.2 * MM, 1.2 * MM], thickness: 0.5, color: htx };
  page.drawLine({ start: { x: tx, y: H - 13.6 * MM }, end: { x: px - 2.5 * MM, y: H - 13.6 * MM }, ...dash });
  page.drawText('Team:', { x: tx, y: H - 17.4 * MM, size: 5.9, font: f.bold, color: htx });
  page.drawLine({ start: { x: tx + 7.5 * MM, y: H - 17.6 * MM }, end: { x: px - 2.5 * MM, y: H - 17.6 * MM }, ...dash });
  page.drawText('Membership card:', { x: tx, y: H - 20.4 * MM, size: 5.9, font: f.bold, color: htx });
  page.drawLine({ start: { x: tx + 17.5 * MM, y: H - 20.6 * MM }, end: { x: px - 2.5 * MM, y: H - 20.6 * MM }, ...dash });
  let y = H - hh - 3.0 * MM; const line = hex('#c9c6b6');
  for (const s of sections) {
    page.drawText(s.label, { x: tx, y: y - 2.2 * MM, size: 6.0, font: f.bold, color: acc }); y -= 4.6 * MM;
    for (let i = 0; i < s.lines; i++) {
      y -= 4.8 * MM;
      page.drawCircle({ x: tx + 1.0 * MM, y: y + 1.2 * MM, size: 0.55 * MM, color: acc });
      page.drawLine({ start: { x: tx + 3.2 * MM, y }, end: { x: W - 3.6 * MM, y }, thickness: 0.45, color: line });
    }
    y -= 2.4 * MM;
  }
}
