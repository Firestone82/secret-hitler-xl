import { Injectable, signal } from '@angular/core';
import { setSeatTables } from '../print/plan';
import { Block, PieceInfo, Role, RolesFile, RulebookFile } from './types';

/** Loads the JSON files once. Everything else in the app reads from here. */
@Injectable({ providedIn: 'root' })
export class DataService {
  readonly roles = signal<RolesFile | null>(null);
  readonly rulebook = signal<Block[] | null>(null);
  /** rulebook.json without its blocks: version, changelog, downloads and seat tables */
  readonly rulebookMeta = signal<Omit<RulebookFile, 'blocks'> | null>(null);
  readonly pieces = signal<Record<string, PieceInfo> | null>(null);
  private loading?: Promise<void>;

  load(): Promise<void> {
    // set the signals together, so the seat tables are in place before anything plans a print
    this.loading ??= Promise.all([
      fetchJson<RolesFile>('data/roles.json'),
      fetchJson<RulebookFile>('data/rulebook.json'),
      fetchJson<Record<string, PieceInfo>>('data/pieces.json'),
    ]).then(([roles, { blocks, ...meta }, pieces]) => {
      setSeatTables(meta.setup);
      this.rulebookMeta.set(meta);
      this.rulebook.set(blocks);
      this.roles.set(roles);
      this.pieces.set(pieces);
    });
    return this.loading;
  }

  role(id: string): Role | undefined {
    return this.roles()?.roles.find((r) => r.id === id);
  }
}

export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
  return res.json() as Promise<T>;
}
