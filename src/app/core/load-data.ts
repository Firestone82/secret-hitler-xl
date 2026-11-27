import { Block, PieceInfo, Palette, Role, RolesFile, RulebookFile } from './types';

/** Reads a JSON file from public/, by its path there (in the browser a fetch, in the tools a file read). */
export type JsonReader = <T>(path: string) => Promise<T>;

/** data/roles/: index.json lists the roles in order, one file per role, and the palettes. */
export async function loadRoles(read: JsonReader): Promise<RolesFile> {
  const [index, palettes] = await Promise.all([
    read<{ roles: string[]; blank: RolesFile['blank'] }>('data/roles/index.json'),
    read<Record<string, Palette>>('data/roles/palettes.json'),
  ]);
  const roles = await Promise.all(index.roles.map((id) => read<Role>(`data/roles/${id}.json`)));
  return { palettes, roles, blank: index.blank };
}

/** data/rulebook/: index.json (version, downloads, the chapter list), changelog, seat tables and one file per chapter. */
export async function loadRulebook(read: JsonReader): Promise<RulebookFile> {
  const index = await read<Omit<RulebookFile, 'changelog' | 'setup' | 'blocks'> & { chapters: string[] }>('data/rulebook/index.json');
  const [changelog, setup, chapters] = await Promise.all([
    read<RulebookFile['changelog']>('data/rulebook/changelog.json'),
    read<RulebookFile['setup']>('data/rulebook/setup.json'),
    Promise.all(index.chapters.map((c) => read<Block[]>(`data/rulebook/chapters/${c}.json`))),
  ]);
  const { chapters: _, ...meta } = index;
  return { ...meta, changelog, setup, blocks: chapters.flat() };
}

export const loadCards = (read: JsonReader) => read<Record<string, PieceInfo>>('data/cards.json');
