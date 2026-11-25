import { PDFDocument, PDFEmbeddedPage, PDFFont, PDFImage, PDFPage, clip, concatTransformationMatrix, degrees, endPath, popGraphicsState, pushGraphicsState, rectangle, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { RolesFile } from '../core/types';
import { BriefingFonts, MM, drawBlankBriefing, drawBriefing } from './briefing-pdf';
import { BLEED, Draw, Item, PAGE, PrintFile, Sheet } from './layout';
import { Paper } from './options';

/** Where the renderer gets its files from: fetch() in the browser, the file system in tests. */
export type Loader = (path: string) => Promise<Uint8Array>;
export const fetchLoader: Loader = async (path) => {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`Could not load ${path}`);
  return new Uint8Array(await r.arrayBuffer());
};

const PIECE_BLEED = 3;   // the piece files carry 3 mm bleed; the sheets keep 1.5 mm of it
/** Colours of the printer's marks: visible enough to cut along, light enough not to stand out. */
const MARK = { crop: rgb(0.5, 0.5, 0.5), gap: rgb(0.78, 0.78, 0.78), target: rgb(0.6, 0.6, 0.6), text: rgb(0.45, 0.45, 0.45) };

class Cache {
  private m = new Map<string, Promise<Uint8Array>>();
  constructor(private load: Loader) {}
  get(p: string) { if (!this.m.has(p)) this.m.set(p, this.load(p)); return this.m.get(p)!; }
}

interface Ctx {
  doc: PDFDocument;
  paper: Paper;
  PW: number; PH: number;
  pages: Map<string, [PDFEmbeddedPage, PDFEmbeddedPage]>;
  portraits: Map<string, PDFImage>;
  fonts: BriefingFonts & { label: PDFFont };
  data: RolesFile;
}

const pt = (v: number) => v * MM;

export class Renderer {
  private cache: Cache;
  constructor(load: Loader = fetchLoader) { this.cache = new Cache(load); }

  async render(file: PrintFile, paper: Paper, data: RolesFile, progress?: (done: number, total: number) => void): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    doc.setTitle(`Secret Hitler + XL - ${paper} - ${file.title}`);
    doc.setCreator('Secret Hitler XL print builder');
    const font = async (f: string) => doc.embedFont(await this.cache.get('fonts/' + f), { subset: true });
    const [medium, bold, germania] = await Promise.all([font('Jost-Medium.ttf'), font('Jost-Bold.ttf'), font('GermaniaOne-Regular.ttf')]);
    const [PW, PH] = PAGE[paper];
    const ctx: Ctx = { doc, paper, PW, PH, pages: new Map(), portraits: new Map(), fonts: { medium, bold, germania, label: medium }, data };

    // embed every piece and portrait once
    const ids = new Set<string>(), roles = new Set<string>();
    for (const s of file.sheets) for (const it of s.items) for (const d of [it.front, it.back]) {
      if (d.face.type === 'piece') ids.add(d.face.id);
      if (d.face.type === 'briefing') roles.add(d.face.role);
    }
    const total = ids.size + roles.size + file.sheets.length; let done = 0;
    const tick = () => progress?.(++done, total);
    await Promise.all([...ids].map(async (id) => {
      const [f, b] = await doc.embedPdf(await this.cache.get(`pieces/${id}.pdf`), [0, 1]);
      ctx.pages.set(id, [f, b]); tick();
    }));
    await Promise.all([...roles].map(async (rid) => {
      const r = data.roles.find((x) => x.id === rid)!;
      ctx.portraits.set(rid, await doc.embedJpg(await this.cache.get(`portraits/${r.portrait}.jpg`))); tick();
    }));

    file.sheets.forEach((sh, i) => {
      for (const back of [false, true]) {
        const page = doc.addPage([pt(PW), pt(PH)]);
        for (const it of sh.items) this.item(ctx, page, it, back);
        this.marks(ctx, page, sh, back, `Sheet ${i + 1}/${file.sheets.length} ${back ? 'BACK' : 'FRONT'} - ${sh.title} - ${paper}, 100%, flip on long edge`);
      }
      tick();
    });
    return doc.save({ useObjectStreams: true });
  }

  /** One briefing card on its own page, for previews. */
  async briefingPdf(roleId: string | null, palette: string, data: RolesFile): Promise<Uint8Array> {
    const doc = await PDFDocument.create(); doc.registerFontkit(fontkit);
    const font = async (f: string) => doc.embedFont(await this.cache.get('fonts/' + f), { subset: true });
    const fonts = { medium: await font('Jost-Medium.ttf'), bold: await font('Jost-Bold.ttf'), germania: await font('GermaniaOne-Regular.ttf') };
    const page = doc.addPage([pt(63.5), pt(88)]);
    if (roleId) {
      const r = data.roles.find((x) => x.id === roleId)!;
      const img = await doc.embedJpg(await this.cache.get(`portraits/${r.portrait}.jpg`));
      drawBriefing(page, r, data.palettes[r.palette], fonts, img, 0);
    } else drawBlankBriefing(page, data.palettes[palette], data.blank.sections, fonts, 0);
    return doc.save();
  }

  private item(ctx: Ctx, page: PDFPage, it: Item, back: boolean) {
    const { PH, PW } = ctx;
    const x = back ? PW - it.x - it.w : it.x;
    let [l, r, t, b] = it.free; if (back) [l, r] = [r, l];
    const X0 = x - BLEED * +l, X1 = x + it.w + BLEED * +r, Y0 = it.y - BLEED * +t, Y1 = it.y + it.h + BLEED * +b;
    page.pushOperators(pushGraphicsState(), rectangle(pt(X0), pt(PH - Y1), pt(X1 - X0), pt(Y1 - Y0)), clip(), endPath());
    const d = back ? it.back : it.front;
    this.face(ctx, page, d, x + it.w / 2 + d.dx, it.y + it.h / 2, [X0, Y0, X1, Y1]);
    if (it.notch) this.notch(page, it, x, PH);
    page.pushOperators(popGraphicsState());
  }

  private face(ctx: Ctx, page: PDFPage, d: Draw, cx: number, cy: number, box: number[]) {
    const C = { x: pt(cx), y: pt(ctx.PH - cy) };
    const th = (d.rot * Math.PI) / 180, cos = Math.round(Math.cos(th)), sin = Math.round(Math.sin(th));
    const f = d.face;
    if (f.type === 'piece') {
      const emb = ctx.pages.get(f.id)![f.page];
      const pw = pt(d.w + 2 * PIECE_BLEED), ph = pt(d.h + 2 * PIECE_BLEED);
      const vx = (pw / 2) * cos - (ph / 2) * sin, vy = (pw / 2) * sin + (ph / 2) * cos;
      page.drawPage(emb, { x: C.x - vx, y: C.y - vy, width: pw, height: ph, rotate: degrees(d.rot) });
    } else if (f.type === 'solid') {
      const [X0, Y0, X1, Y1] = box;
      page.drawRectangle({ x: pt(X0), y: pt(ctx.PH - Y1), width: pt(X1 - X0), height: pt(Y1 - Y0), color: rgb(f.rgb[0] / 255, f.rgb[1] / 255, f.rgb[2] / 255) });
    } else {
      const W = pt(d.w), H = pt(d.h);
      const e = C.x - (cos * W / 2 - sin * H / 2), g = C.y - (sin * W / 2 + cos * H / 2);
      page.pushOperators(pushGraphicsState(), concatTransformationMatrix(cos, sin, -sin, cos, e, g));
      if (f.type === 'briefing') {
        const r = ctx.data.roles.find((x) => x.id === f.role)!;
        drawBriefing(page, r, ctx.data.palettes[r.palette], ctx.fonts, ctx.portraits.get(f.role) ?? null, pt(PIECE_BLEED));
      } else drawBlankBriefing(page, ctx.data.palettes[f.palette], ctx.data.blank.sections, ctx.fonts, pt(PIECE_BLEED));
      page.pushOperators(popGraphicsState());
    }
  }

  /** small triangles on both long edges at mid-length: where to cut or fold a board in half */
  private notch(page: PDFPage, it: Item, x: number, PH: number) {
    const [r, g, b] = it.notch!, color = rgb(r, g, b);
    const tri = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) =>
      page.drawSvgPath(`M${pt(ax)},${pt(ay)} L${pt(bx)},${pt(by)} L${pt(cx)},${pt(cy)} Z`, { x: 0, y: pt(PH), color });
    if (it.h > it.w) {
      const my = it.y + it.h / 2;
      tri(x, my - 0.8, x, my + 0.8, x + 1.1, my); tri(x + it.w, my - 0.8, x + it.w, my + 0.8, x + it.w - 1.1, my);
    } else {
      const mx = x + it.w / 2;
      tri(mx - 0.8, it.y, mx + 0.8, it.y, mx, it.y + 1.1); tri(mx - 0.8, it.y + it.h, mx + 0.8, it.y + it.h, mx, it.y + it.h - 1.1);
    }
  }

  private marks(ctx: Ctx, page: PDFPage, sh: Sheet, back: boolean, label: string) {
    const { PW, PH, paper } = ctx, A4 = paper === 'A4';
    // Kept light so they do not show on the cut pieces: crop marks mid-grey, lines through the gaps barely there.
    const { crop, gap, target, text } = MARK;
    const ln = (x1: number, y1: number, x2: number, y2: number, color = crop, w = 0.2, dash?: number) =>
      page.drawLine({ start: { x: pt(x1), y: pt(PH - y1) }, end: { x: pt(x2), y: pt(PH - y2) }, thickness: w, color, dashArray: dash ? [dash, dash] : undefined });
    const xs = new Set<number>(), ys = new Set<number>();
    const ix = (it: Item) => (back ? PW - it.x - it.w : it.x);
    for (const it of sh.items) { const x = ix(it); xs.add(+x.toFixed(3)); xs.add(+(x + it.w).toFixed(3)); ys.add(+it.y.toFixed(3)); ys.add(+(it.y + it.h).toFixed(3)); }
    const sx = [...xs].sort((a, b) => a - b), sy = [...ys].sort((a, b) => a - b);
    const x0 = sx[0] - BLEED, x1 = sx[sx.length - 1] + BLEED, y0 = sy[0] - BLEED, y1 = sy[sy.length - 1] + BLEED;
    const [L, G] = A4 ? [2.6, 0.7] : [4.0, 1.2];
    for (const x of sx) { ln(x, y0 - G, x, y0 - G - L); ln(x, y1 + G, x, y1 + G + L); }
    for (const y of sy) { ln(x0 - G, y, x0 - G - L, y); ln(x1 + G, y, x1 + G + L, y); }
    // cut lines continued through the gaps between pieces
    const gaps = (v: number[]) => v.slice(1).map((b, i) => [v[i], b]).filter(([a, b]) => b - a > 0 && b - a <= 8);
    for (const x of sx) for (const [a, b] of gaps(sy)) ln(x, a, x, b, gap, 0.12);
    for (const y of sy) for (const [a, b] of gaps(sx)) ln(a, y, b, y, gap, 0.12);
    // registration targets: corners and the middle of every edge, where they stay clear of the artwork
    const [TG, TR, TC] = A4 ? [5, 1.1, 2] : [7.5, 1.6, 3];
    const clear = (tx: number, ty: number) => sh.items.every((it) => {
      const x = ix(it), r = TC + 0.5;
      return tx + r < x - BLEED || tx - r > x + it.w + BLEED || ty + r < it.y - BLEED || ty - r > it.y + it.h + BLEED;
    });
    for (const [tx, ty] of [[TG, TG], [PW - TG, TG], [TG, PH - TG], [PW - TG, PH - TG], [PW / 2, TG], [PW / 2, PH - TG], [TG, PH / 2], [PW - TG, PH / 2]]) {
      if (!clear(tx, ty)) continue;
      page.drawCircle({ x: pt(tx), y: pt(PH - ty), size: pt(TR), borderColor: target, borderWidth: 0.2 });
      ln(tx - TC, ty, tx + TC, ty, target); ln(tx, ty - TC, tx, ty + TC, target);
    }
    ln(PW / 2, y0 - G, PW / 2, y0 - G - L, crop, 0.2, 1); ln(PW / 2, y1 + G, PW / 2, y1 + G + L, crop, 0.2, 1);
    for (const fx0 of sh.fold ?? []) {
      const fx = back ? PW - fx0 : fx0;
      ln(fx, y0 - G - L - 1, fx, y0 - G - L - 5, crop, 0.2, 1.5); ln(fx, y1 + G, fx, y1 + G + L + 2, crop, 0.2, 1.5);
      const w = ctx.fonts.label.widthOfTextAtSize('FOLD', 5.5);
      page.drawText('FOLD', { x: pt(fx) - w / 2, y: pt(PH - (y0 - G - L - 6)), size: 5.5, font: ctx.fonts.label, color: text });
    }
    for (const fy of sh.yfold ?? []) { ln(x0 - G, fy, x0 - G - L, fy, crop, 0.2, 1.5); ln(x1 + G, fy, x1 + G + L, fy, crop, 0.2, 1.5); }
    for (const cy of sh.centre ?? []) {
      ln(x0 - G, cy, x0 - G - L, cy, crop, 0.2, 1.2); ln(x1 + G, cy, x1 + G + L, cy, crop, 0.2, 1.2);
      const w = ctx.fonts.label.widthOfTextAtSize('HALF', 5);
      page.drawText('HALF', { x: pt(x0 - G - L - 0.8), y: pt(PH - cy) - w / 2, size: 5, font: ctx.fonts.label, color: text, rotate: degrees(90) });
    }
    const room = pt(sx[1] - sx[0] - 4); let fs = 6;
    while (ctx.fonts.label.widthOfTextAtSize(label, fs) > room && fs > 3.5) fs -= 0.1;
    page.drawText(label, { x: pt(sx[0] + 2), y: pt(PH - (y0 - G - 1.3)), size: fs, font: ctx.fonts.label, color: text });
  }
}


