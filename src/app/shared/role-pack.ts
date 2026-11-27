import { cardImage, cardPdf, portrait } from '../core/assets';
import { Role, RolesFile } from '../core/types';

/** File-name friendly form of a role name: "Fascist Spy" -> "Fascist_Spy". */
const slug = (s: string) => s.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');

/**
 * Builds a zip with every file of one role: the Secret Role card(s) as images and as print-ready PDFs
 * (front and back with bleed), the Role Briefing card as a PDF and the portrait.
 */
export async function rolePack(role: Role, data: RolesFile): Promise<{ bytes: Uint8Array; name: string }> {
  const [{ default: JSZip }, { Renderer, fetchLoader }] = await Promise.all([import('jszip'), import('../print/render')]);
  const zip = new JSZip();
  const base = slug(role.name);
  const many = role.art.length > 1;

  // [name in the zip, file]; fetched in parallel, added in a stable order
  const entries: [string, Promise<Uint8Array>][] = [];
  role.art.forEach((art, i) => entries.push([`${base}_Secret_Role_card${many ? `_${i + 1}` : ''}.jpg`, fetchLoader(cardImage(art))]));
  entries.push([`${base}_portrait.jpg`, fetchLoader(portrait(role))]);
  entries.push([`print/${base}_Role_Briefing_card.pdf`, new Renderer().briefingPdf(role.id, '', data)]);
  role.art.forEach((art, i) => entries.push([`print/${base}_Secret_Role_card${many ? `_${i + 1}` : ''}.pdf`, fetchLoader(cardPdf(art))]));
  const bytes = await Promise.all(entries.map(([, p]) => p));
  entries.forEach(([name], i) => zip.file(name, bytes[i]));

  zip.file('README.txt', [
    `SECRET HITLER + XL - ${role.name.toUpperCase()}`, '',
    `${base}_Secret_Role_card*.jpg   the Secret Role card, for screens`,
    `${base}_portrait.jpg            the portrait used on the Role Briefing card`,
    `print/*.pdf                     print-ready cards: page 1 front, page 2 back, 3 mm bleed`, '',
    'Licensed under CC BY-NC-SA 4.0. See the Credits page of the website.',
  ].join('\r\n'));

  return { bytes: await zip.generateAsync({ type: 'uint8array' }), name: `Secret_Hitler_XL_${base}.zip` };
}
