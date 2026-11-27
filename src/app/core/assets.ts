import { PieceInfo, Role } from './types';

/**
 * Where the pictures and files in public/ live. Every printable piece is under cards/<group>/<name>:
 * <id>.pdf to print, <id>.jpg at full size and thumb/<id>.jpg for pages that show many at once.
 * Backs that many pieces share are in cards/backs/ (see "back" in data/cards.json).
 */
let catalog: Record<string, PieceInfo> = {};
/** Set once data/cards.json is loaded, so the back of each piece can be found. */
export function setCardCatalog(cards: Record<string, PieceInfo>): void {
  catalog = cards;
}

/** The picture of a piece: page 0 is the front, page 1 the back. */
export function cardImage(id: string, page = 0, size: 'full' | 'thumb' = 'full'): string {
  const name = page === 1 ? (catalog[id]?.back ?? id + '_back') : id;
  return `cards/${size === 'thumb' ? 'thumb/' : ''}${name}.jpg`;
}

export const cardPdf = (id: string) => `cards/${id}.pdf`;

/** The small copy of a picture under cards/; anything else is returned as it is. */
export function thumb(path: string): string {
  return path.startsWith('cards/') && !path.startsWith('cards/thumb/') && !path.includes('/portraits/') ? 'cards/thumb/' + path.slice(6) : path;
}

/** The full-size copy of a thumbnail, for opening a picture at full size. */
export function fullSize(path: string): string {
  return path.replace(/(^|\/)cards\/thumb\//, '$1cards/');
}

export const portrait = (role: Pick<Role, 'portrait'>) => `cards/briefing/portraits/${role.portrait}.jpg`;

/** Picture of a Role Briefing card with its text: a role id, or blank_<palette>. */
export const briefingImage = (name: string, size: 'full' | 'thumb' = 'full') => `cards/${size === 'thumb' ? 'thumb/' : ''}briefing/${name}.jpg`;
