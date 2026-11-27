import { PieceInfo } from '../core/types';
import { PrintOptions } from './options';
import { INSERT_MM, Slot } from './plan';

/** The name of a piece in the print-service files: the card's label from data/cards.json, else the slot's name.
 *  Shared by the print builder page and tools/release/print_files.mts. */
export function pieceLabel(slot: Slot, cards: Record<string, PieceInfo> | null | undefined): string {
  const f = slot.front;
  return (f.type === 'piece' && cards?.[f.id]?.label) || slot.name;
}

/** README.txt of the print-service zip. */
export function pieceReadme(o: PrintOptions, pieces: number, copies: number): string {
  return [
    'SECRET HITLER + XL - PIECES FOR A PRINT SERVICE', '',
    `Players: up to ${o.players}. ${o.xl ? 'Secret Hitler XL' + (o.communists ? ' with the Communists' : '') : 'Original game only'}.`,
    ...(o.base ? [] : ['Only what XL adds to the original box: play it together with your copy of Secret Hitler.']),
    `${pieces} different pieces, ${copies} copies in total.`, '',
    'Every piece has a front and a back file, one page each: the cut size plus 3 mm bleed on every side.',
    o.perCopy ? 'Each copy has its own pair of files.' : 'The number of copies is in the file name (_x4 = four copies) and in manifest.csv.',
    `Folders: tiles 44 x 68 mm (mini European sleeves), cards 63.5 x 88 mm (standard sleeves), boards ${mmText(395, 134)}, borderless boards ${mmText(...INSERT_MM['fascist_9-10'])} (Liberal ${mmText(...INSERT_MM['liberal'])}), reference cards ${o.refSize === 'small' ? '280 x 95' : '395 x 134'} mm, placards 104.5 x 176 mm (fold in half).`, '',
    'Secret Hitler by Mike Boxleiter, Tommy Maranges, Max Temkin and Mac Schubert. Secret Hitler XL by Lord_Roguy.',
    'Licensed CC BY-NC-SA 4.0: not for commercial use.',
  ].join('\n');
}

function mmText(w: number, h: number): string {
  return `${w} x ${h} mm`;
}
