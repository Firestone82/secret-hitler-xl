import { Injectable, signal } from '@angular/core';
import { Block, PieceInfo, Role, RolesFile } from './types';

/** Loads the JSON files once. Everything else in the app reads from here. */
@Injectable({ providedIn: 'root' })
export class DataService {
  readonly roles = signal<RolesFile | null>(null);
  readonly rulebook = signal<Block[] | null>(null);
  readonly pieces = signal<Record<string, PieceInfo> | null>(null);
  private loading?: Promise<void>;

  load(): Promise<void> {
    this.loading ??= Promise.all([
      fetchJson<RolesFile>('data/roles.json').then((r) => this.roles.set(r)),
      fetchJson<{ blocks: Block[] }>('data/rulebook.json').then((r) => this.rulebook.set(r.blocks)),
      fetchJson<Record<string, PieceInfo>>('data/pieces.json').then((r) => this.pieces.set(r)),
    ]).then(() => undefined);
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
