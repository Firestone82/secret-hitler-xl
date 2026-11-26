import { Paper } from './options';
import { Face, Plan, Slot } from './plan';

/** Geometry in millimetres, origin at the top-left corner of the sheet, y downwards. */
export interface Draw {
  face: Face;
  /** rotation in degrees, counter-clockwise as on paper (-90 = clockwise) */
  rot: 0 | 90 | -90;
  /** horizontal shift of the artwork against the piece centre (board halves) */
  dx: number;
  /** size of the artwork without bleed, before rotation */
  w: number;
  h: number;
  /** the piece file is drawn at this scale, bleed included */
  scale: number;
}

export interface Item {
  x: number; y: number; w: number; h: number;
  front: Draw; back: Draw;
  name: string;
  /** which sides get bleed: left, right, top, bottom */
  free: [boolean, boolean, boolean, boolean];
  notch?: [number, number, number];
}

export interface Sheet {
  title: string;
  items: Item[];
  fold?: number[];
  yfold?: number[];
  centre?: number[];
}

export interface PrintFile {
  key: 'main';
  name: string;
  title: string;
  sheets: Sheet[];
}

export const BLEED = 1.5;
export const PAGE: Record<Paper, [number, number]> = { A3: [297, 420], A4: [210, 297] };
export const SIZE: Record<Slot['size'], [number, number]> = {
  tile: [44, 68], card: [63.5, 88], long: [395, 134], insert: [390, 130], placard: [104.5, 176],
};
/** Cut size of a slot in mm, with its scale applied. */
export function slotSize(slot: Slot): [number, number] {
  const [w, h] = slot.mm ?? SIZE[slot.size], s = slot.scale ?? 1;
  return [+(w * s).toFixed(2), +(h * s).toFixed(2)];
}
const GUT = 3;
const BOARD_NOTCH: [number, number, number] = [0.30, 0.31, 0.29];
const INSERT_NOTCH: Record<string, [number, number, number]> = { l: [97, 201, 217], f: [230, 100, 68], c: [230, 72, 66] };

function draw(slot: Slot, side: 'front' | 'back', rot: 0 | 90 | -90, dx = 0): Draw {
  const [w, h] = slotSize(slot);
  return { face: side === 'front' ? slot.front : slot.back, rot, dx, w, h, scale: slot.scale ?? 1 };
}

/** Cards in a grid. rotated = landscape cells with the card turned (A3). */
function cardSheets(title: string, slots: Slot[], paper: Paper, rotated: boolean, cols: number, rows: number, gx: number, gy: number): Sheet[] {
  if (!slots.length) return [];
  const [PW, PH] = PAGE[paper];
  const [cw0, ch0] = slotSize(slots[0]);
  const cw = rotated ? ch0 : cw0, ch = rotated ? cw0 : ch0;
  const tw = cols * cw + (cols - 1) * gx, th = rows * ch + (rows - 1) * gy;
  const ox = (PW - tw) / 2, oy = (PH - th) / 2, per = cols * rows;
  const n = Math.ceil(slots.length / per), out: Sheet[] = [];
  for (let s = 0; s < n; s++) {
    const items: Item[] = slots.slice(s * per, (s + 1) * per).map((slot, i) => {
      const r = Math.floor(i / cols), c = i % cols;
      return {
        x: ox + c * (cw + gx), y: oy + r * (ch + gy), w: cw, h: ch,
        front: draw(slot, 'front', rotated ? -90 : 0), back: draw(slot, 'back', rotated ? 90 : 0), name: slot.name,
        free: [c === 0 || gx > 0, c === cols - 1 || gx > 0, r === 0 || gy > 0, r === rows - 1 || gy > 0],
      };
    });
    const kinds = [...new Set(items.map((i) => kindOf(i.name)))].join(' + ');
    out.push({ title: n > 1 ? `${title} ${s + 1}/${n}: ${kinds}` : `${title}: ${kinds}`, items });
  }
  return out;
}

function kindOf(name: string): string {
  if (/briefing/i.test(name)) return 'Role Briefings';
  if (/role/i.test(name)) return 'Secret Roles';
  if (/membership|Lobby card$/i.test(name)) return 'Party Membership';
  if (/ballot/i.test(name)) return 'Ballots';
  if (/pile/i.test(name)) return 'Pile cards';
  if (/policy|tile|Emergency|Anti/i.test(name)) return 'Policy tiles';
  return name;
}

function notchFor(slot: Slot): [number, number, number] | undefined {
  if (slot.size === 'long') return BOARD_NOTCH;
  if (slot.size === 'insert') {
    const id = slot.front.type === 'piece' ? slot.front.id : '';
    const c = INSERT_NOTCH[id.replace('i_', '')[0]] ?? [120, 120, 120];
    return c.map((v) => (v / 255) * 0.8) as [number, number, number];
  }
  return undefined;
}

/** A3: long pieces upright, side by side, as many as fit across the sheet (two boards, three borderless boards).
 *  Placards fill a free half if there is one. */
function longSheetsA3(title: string, slots: Slot[], placards: Slot[]): Sheet[] {
  const [PW, PH] = PAGE.A3, out: Sheet[] = [], GAP = 4, ROOM = PW - 20;
  for (let i = 0; i < slots.length;) {
    const row = [slots[i]];
    let w = slotSize(slots[i])[1];
    while (i + row.length < slots.length && w + GAP + slotSize(slots[i + row.length])[1] <= ROOM) w += GAP + slotSize(slots[i + row.length])[1], row.push(slots[i + row.length]);
    i += row.length;
    const S0 = slotSize(row[0])[1], [pw, ph] = SIZE.placard;
    const withPlacards = row.length === 1 && placards.length > 0 && S0 >= pw;
    let x = withPlacards ? (PW - (2 * S0 + GAP)) / 2 : (PW - w) / 2;
    const items: Item[] = row.map((slot) => {
      const [L, S] = slotSize(slot);
      const it: Item = { x, y: (PH - L) / 2, w: S, h: L, name: slot.name, front: draw(slot, 'front', -90), back: draw(slot, 'back', 90), free: [true, true, true, true], notch: notchFor(slot) };
      x += S + GAP;
      return it;
    });
    const sheet: Sheet = { title: `${title}: ${row.map((p) => p.name).join(' + ')}`, items, centre: [PH / 2] };
    if (withPlacards) {
      const px = x + (S0 - pw) / 2, py = (PH - (2 * ph + 6)) / 2;
      placards.forEach((p, k) => items.push({ x: px, y: py + k * (ph + 6), w: pw, h: ph, name: p.name, front: draw(p, 'front', 0), back: draw(p, 'back', 0), free: [true, true, true, true] }));
      sheet.fold = [px + pw / 2]; sheet.title += ' + placards (fold in half)';
      placards = [];
    }
    out.push(sheet);
  }
  if (placards.length) {
    const [pw, ph] = SIZE.placard, ox = (PW - (2 * pw + GUT)) / 2, y = (PH - ph) / 2;
    out.push({
      title: 'President and Chancellor placards (fold in half)',
      fold: placards.map((_, k) => ox + k * (pw + GUT) + pw / 2),
      items: placards.map((p, k) => ({ x: ox + k * (pw + GUT), y, w: pw, h: ph, name: p.name, front: draw(p, 'front', 0), back: draw(p, 'back', 0), free: [true, true, true, true] as Item['free'] })),
    });
  }
  return out;
}

/** A4: a long piece as a left and a right half, stacked on one sheet. */
function longSheetsA4(title: string, slots: Slot[], placards: Slot[]): Sheet[] {
  const [PW, PH] = PAGE.A4, out: Sheet[] = [];
  for (const slot of slots) {
    const [L, S] = slotSize(slot), hl = L / 2, gap = 6, ox = (PW - hl) / 2, oy = (PH - (2 * S + gap)) / 2;
    const items: Item[] = [0, 1].map((i) => {
      const off = i === 0 ? 0 : hl;
      return {
        x: ox, y: oy + i * (S + gap), w: hl, h: S, name: `${slot.name} (${i ? 'right' : 'left'} half)`, free: [true, true, true, true],
        front: draw(slot, 'front', 0, L / 2 - off - hl / 2), back: draw(slot, 'back', 0, L / 2 - (hl - off) - hl / 2),
      };
    });
    out.push({ title: `${title}: ${slot.name} - cut, then tape the halves together`, items });
  }
  if (placards.length) {
    const [pw, ph] = SIZE.placard, ox = (PW - ph) / 2, oy = (PH - (2 * pw + 6)) / 2;
    const items: Item[] = placards.map((p, i) => ({ x: ox, y: oy + i * (pw + 6), w: ph, h: pw, name: p.name, front: draw(p, 'front', 90), back: draw(p, 'back', 0), free: [true, true, true, true] }));
    out.push({ title: 'President and Chancellor placards - fold along the long middle', yfold: items.map((it) => it.y + pw / 2), items });
  }
  return out;
}

/** Lays out every sheet of the plan, all in one print file. */
export function layout(plan: Plan, paper: Paper): PrintFile[] {
  const a3 = paper === 'A3';
  const cards = [...plan.ballots, ...plan.cards];
  const tiles = a3 ? cardSheets('Policy tiles', plan.tiles, paper, true, 3, 8, GUT, GUT) : cardSheets('Policy tiles', plan.tiles, paper, false, 4, 4, GUT, 0);
  const cardS = a3 ? cardSheets('Cards', cards, paper, true, 3, 6, GUT, GUT) : cardSheets('Cards', cards, paper, false, 3, 3, 0, GUT);
  const longs = (a3 ? longSheetsA3 : longSheetsA4)('Boards', plan.longs, plan.placards);
  // small reference cards: four stacked on A3, two side by side on A4
  const refs = a3 ? cardSheets('Reference cards', plan.refs, paper, false, 1, 4, 4, 4) : cardSheets('Reference cards', plan.refs, paper, true, 2, 1, 4, 4);
  const insertS = (a3 ? longSheetsA3 : longSheetsA4)('Borderless boards', plan.inserts, []);
  const all = [...tiles, ...cardS, ...longs, ...refs, ...insertS];
  return all.length ? [{ key: 'main', name: `Secret_Hitler_XL_${paper}_duplex.pdf`, title: 'Everything', sheets: all }] : [];
}
