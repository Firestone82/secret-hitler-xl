import { RolesFile } from '../core/types';
import { BLEED, Item, PAGE, PrintFile, Sheet, slotSize } from './layout';
import { Slot } from './plan';
import { Paper } from './options';

const PIECE_BLEED = 3;

/** One piece of a sheet as the preview draws it: an SVG viewport in millimetres. */
export interface PreviewItem {
  /** clip box: the piece plus the bleed the sheet keeps on its free sides */
  x: number; y: number; w: number; h: number;
  /** artwork transform inside the clip box */
  transform: string;
  /** artwork size with the piece file's own bleed */
  aw: number; ah: number;
  img?: string;
  fill?: string;
  briefing?: { header: string; headerText: string; paper: string; name: string };
  name: string;
  /** cut lines, relative to the clip box */
  cut: { x: number; y: number; w: number; h: number };
}

export interface PreviewSheet {
  title: string;
  w: number; h: number;
  items: PreviewItem[];
}

/** Lays one side of a sheet out for the on-screen preview, mirroring what render.ts draws. */
export function previewSheet(sheet: Sheet, paper: Paper, back: boolean, data: RolesFile): PreviewSheet {
  const [PW, PH] = PAGE[paper];
  return { title: sheet.title, w: PW, h: PH, items: sheet.items.map((it) => previewItem(it, PW, back, data)) };
}

function previewItem(it: Item, PW: number, back: boolean, data: RolesFile): PreviewItem {
  const x = back ? PW - it.x - it.w : it.x;
  let [l, r, t, b] = it.free; if (back) [l, r] = [r, l];
  const X0 = x - BLEED * +l, X1 = x + it.w + BLEED * +r, Y0 = it.y - BLEED * +t, Y1 = it.y + it.h + BLEED * +b;
  const d = back ? it.back : it.front;
  const f = d.face;
  // the renderer turns counter-clockwise on paper; SVG turns clockwise with y downwards
  const cx = x + it.w / 2 + d.dx - X0, cy = it.y + it.h / 2 - Y0;
  const out: PreviewItem = {
    x: X0, y: Y0, w: X1 - X0, h: Y1 - Y0, name: it.name,
    transform: `translate(${cx} ${cy}) rotate(${-d.rot})`,
    aw: d.w, ah: d.h,
    cut: { x: x - X0, y: it.y - Y0, w: it.w, h: it.h },
  };
  if (f.type === 'piece') {
    out.img = `preview/${f.id}_${f.page}.jpg`;
    out.aw = d.w + 2 * PIECE_BLEED * d.scale; out.ah = d.h + 2 * PIECE_BLEED * d.scale;
  } else if (f.type === 'solid') {
    out.fill = `rgb(${f.rgb.join(',')})`;
  } else {
    const role = f.type === 'briefing' ? data.roles.find((r) => r.id === f.role) : undefined;
    const pal = data.palettes[role ? role.palette : f.type === 'blankBriefing' ? f.palette : 'neu'] ?? data.palettes['neu'];
    out.briefing = { header: pal.header, headerText: pal.headerText, paper: pal.paper, name: role?.name ?? '' };
    out.aw = d.w + 2 * PIECE_BLEED; out.ah = d.h + 2 * PIECE_BLEED;
  }
  return out;
}

/** Every sheet of every file, numbered for the preview's pager. */
export interface SheetRef { file: PrintFile; index: number; sheet: Sheet }
export function allSheets(files: PrintFile[]): SheetRef[] {
  return files.flatMap((file) => file.sheets.map((sheet, index) => ({ file, index, sheet })));
}

/** A single piece on its own, at cut size plus the 1.5 mm bleed the sheets keep. */
export function previewPiece(slot: Slot, back: boolean, data: RolesFile): PreviewItem {
  const [w, h] = slotSize(slot);
  const draw = (face: Slot['front']) => ({ face, rot: 0 as const, dx: 0, w, h, scale: slot.scale ?? 1 });
  const it: Item = { x: 0, y: 0, w, h, name: slot.name, front: draw(slot.front), back: draw(slot.back), free: [true, true, true, true] };
  return previewItem(it, w, back, data);
}
