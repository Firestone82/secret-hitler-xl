import { Role, RolesFile } from '../core/types';
import { PrintOptions } from './options';

/** What is printed on one side of a piece. */
export type Face =
  | { type: 'piece'; id: string; page: 0 | 1 }
  | { type: 'briefing'; role: string }
  | { type: 'blankBriefing'; palette: string }
  | { type: 'solid'; rgb: [number, number, number] };

export interface Slot {
  front: Face;
  back: Face;
  name: string;
  /** piece id whose cut size and bleed this slot uses */
  size: 'tile' | 'card' | 'long' | 'insert' | 'placard';
}

export interface CountLine {
  group: string;
  label: string;
  count: number;
}

export interface Plan {
  tiles: Slot[];
  cards: Slot[];
  ballots: Slot[];
  longs: Slot[];
  inserts: Slot[];
  placards: Slot[];
  counts: CountLine[];
  minPlayers: number;
}

// who sits at the table (rulebook tables)
const BASE = { from: 5, lib: [3, 4, 4, 5, 5, 6], fas: [1, 1, 2, 2, 3, 3], com: [0, 0, 0, 0, 0, 0] };
const XL = {
  from: 6,
  lib: [3, 4, 4, 4, 5, 5, 6, 6, 7, 7, 7, 7, 8, 9],
  fas: [1, 1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4],
  com: [1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 4, 5, 5, 5],
};
const EMERGENCY = ['e_investigate', 'e_peek', 'e_special_election', 'e_execution', 'e_propaganda', 'e_no_confidence', 'e_censorship', 'e_enabling_act', 'e_article48', 'e_pardon'];
const PLACARD_BACK: [number, number, number] = [224, 146, 39];

const piece = (id: string, page: 0 | 1 = 0): Face => ({ type: 'piece', id, page });
const both = (id: string, name: string, size: Slot['size']): Slot => ({ front: piece(id, 0), back: piece(id, 1), name, size });
const times = <T>(n: number, f: (i: number) => T): T[] => Array.from({ length: Math.max(0, n) }, (_, i) => f(i));

export function seats(o: PrintOptions) {
  const t = o.xl && o.communists ? XL : BASE;
  let lib = 0, fas = 0, com = 0;
  for (let p = t.from; p <= o.players; p++) {
    const i = p - t.from;
    if (i >= t.lib.length) break;
    lib = Math.max(lib, t.lib[i]); fas = Math.max(fas, t.fas[i]); com = Math.max(com, t.com[i]);
  }
  return { lib, fas, com, from: t.from };
}

export function makePlan(o: PrintOptions, data: RolesFile): Plan {
  const roles = data.roles;
  const byId = (id: string) => roles.find((r) => r.id === id)!;
  const extras = roles.filter((r) => r.module === 'roles' && o.roles[r.id]);
  const s = seats(o);
  const counts: CountLine[] = [];
  const count = (group: string, label: string, n: number) => { if (n > 0) counts.push({ group, label, count: n }); };

  // ---- policy tiles
  const tiles: Slot[] = [];
  const nLib = 6 + (o.communists ? 1 : 0), nFas = 11, nCom = o.communists ? 10 : 0;
  tiles.push(...times(nLib, () => both('t_p018', 'Liberal policy', 'tile')));
  tiles.push(...times(nFas, () => both('t_p005', 'Fascist policy', 'tile')));
  tiles.push(...times(nCom, () => both('t_p104', 'Communist policy', 'tile')));
  count('Policy tiles', 'Liberal policies', nLib); count('Policy tiles', 'Fascist policies', nFas); count('Policy tiles', 'Communist policies', nCom);
  if (o.emergency) { for (const e of EMERGENCY) tiles.push(both('t_' + e, 'Emergency power', 'tile')); count('Policy tiles', 'Emergency powers', 10); }
  if (o.antiPolicies) { for (const a of ['t_p060', 't_p014', 't_p129']) tiles.push(both(a, 'Anti-policy', 'tile')); count('Policy tiles', 'Anti-policies', 3); }
  const capitalist = extras.some((r) => r.id === 'capitalist');
  if (capitalist) { tiles.push(both('t_lobby', 'Lobby card (small)', 'tile')); count('Policy tiles', 'Small Lobby card', 1); }
  if (o.blanks) {
    const b = ['t_pblank_liberal', 't_pblank_fascist', ...(o.communists ? ['t_pblank_communist'] : []), ...(o.emergency ? ['t_pblank_emergency'] : [])];
    tiles.push(...b.map((id) => both(id, 'Blank tile', 'tile'))); count('Policy tiles', 'Blank tiles', b.length);
  }

  // ---- role cards: enough regular roles for the largest table, plus one card per optional role
  const roleCards: { role: Role; art: string }[] = [];
  const regular = (id: string, n: number) => { const r = byId(id); for (let i = 0; i < n; i++) roleCards.push({ role: r, art: r.art[i % r.art.length] }); };
  regular('liberal', s.lib); regular('fascist', s.fas); regular('hitler', 1);
  if (o.communists) regular('communist', s.com);
  for (const r of extras) for (let i = 0; i < r.count; i++) roleCards.push({ role: r, art: r.art[i % r.art.length] });
  count('Roles', 'Liberal roles', s.lib); count('Roles', 'Fascist roles', s.fas); count('Roles', 'Hitler', 1);
  if (o.communists) count('Roles', 'Communist roles', s.com);
  for (const r of extras) count('Roles', r.name + (r.count > 1 ? 's' : ''), r.count);

  const cards: Slot[] = [];
  const roleSlots = roleCards.map(({ role, art }) => ({ front: piece('c_' + art, 0), back: piece('c_' + art, 1), name: role.name + ' role', size: 'card' as const }));
  const briefSlots = o.briefings ? roleCards.map(({ role }) => ({ front: { type: 'briefing', role: role.id } as Face, back: piece('c_bback', 0), name: role.name + ' briefing', size: 'card' as const })) : [];
  if (o.briefings) count('Roles', 'Role Briefing cards', briefSlots.length);

  // ---- party membership: every seat plus the cards the rules hand out on top
  const mem = { liberal: s.lib, fascist: s.fas + 1, communist: o.communists ? s.com + 2 : 0, lobby: 0 };
  for (const r of extras) for (const [k, v] of Object.entries(r.extraMembership ?? {})) (mem as any)[k] += v;
  const memSlots: Slot[] = [
    ...times(mem.liberal, () => both('c_069', 'Liberal membership', 'card')),
    ...times(mem.fascist, () => both('c_086', 'Fascist membership', 'card')),
    ...times(mem.communist, () => both('c_098', 'Communist membership', 'card')),
    ...times(mem.lobby, () => both('c_lobby', 'Lobby card', 'card')),
  ];
  count('Party Membership', 'Liberal', mem.liberal); count('Party Membership', 'Fascist', mem.fascist);
  count('Party Membership', 'Communist', mem.communist); count('Party Membership', 'Lobby card', mem.lobby);

  // ---- ballots: one per player and a spare
  const ballots: Slot[] = [];
  if (o.ballots === 'double') {
    ballots.push(...times(o.players + 1, () => both('c_ballot', 'Ballot', 'card')));
    count('Ballots', 'Ballots, Ja! front / Nein back', o.players + 1);
  } else {
    ballots.push(...times(o.players + 1, () => both('c_ja', 'Ja! ballot', 'card')), ...times(o.players + 1, () => both('c_nein', 'Nein ballot', 'card')));
    count('Ballots', 'Ja! ballots', o.players + 1); count('Ballots', 'Nein ballots', o.players + 1);
  }

  const extraCards: Slot[] = [];
  if (o.pileCards) { extraCards.push(both('c_draw', 'Draw pile card', 'card'), both('c_discard', 'Discard pile card', 'card')); count('Other cards', 'Draw and discard pile cards', 2); }
  if (o.blanks) {
    const pals: [string, string][] = [['liberal', 'lib'], ['fascist', 'fas'], ...(o.communists ? [['communist', 'com'] as [string, string]] : []), ['neutral', 'neu']];
    for (const [k] of pals) extraCards.push(both('c_h_blank_' + k, 'Blank role', 'card'));
    if (o.briefings) for (const [, p] of pals) extraCards.push({ front: { type: 'blankBriefing', palette: p }, back: piece('c_bback', 0), name: 'Blank briefing', size: 'card' });
    extraCards.push(both('c_m_blank', 'Blank membership', 'card'), both('c_m_blank', 'Blank membership', 'card'));
    count('Other cards', 'Blank roles' + (o.briefings ? ' + briefings' : ''), pals.length * (o.briefings ? 2 : 1));
    count('Other cards', 'Blank memberships', 2);
  }
  cards.push(...roleSlots, ...briefSlots, ...memSlots, ...extraCards);

  // ---- boards and reference cards
  const longs: Slot[] = [];
  const boards: [string, string][] = [['liberal', 'Liberal board']];
  if (s.from <= 6) boards.push(['fascist_5-6', 'Fascist board 5-6']);
  if (o.players >= 7) boards.push(['fascist_7-8', 'Fascist board 7-8']);
  if (o.players >= 9) boards.push(['fascist_9-10', 'Fascist board 9+']);
  if (o.communists) boards.push(['communist', 'Communist board']);
  if (o.boards) { for (const [k, n] of boards) longs.push(both('b_' + k, n, 'long')); count('Boards', 'Boards with border', boards.length); }
  const inserts: Slot[] = o.inserts ? boards.map(([k, n]) => both('i_' + k, n + ' (borderless)', 'insert')) : [];
  if (o.inserts) count('Boards', 'Borderless boards', inserts.length);
  if (o.referenceCards && o.xl) {
    const ref: string[] = ['r_setupnight', 'r_round', 'r_round'];
    if (o.emergency || o.antiPolicies) ref.push('r_emerg', 'r_emerg');
    if (o.communists) ref.push('r_compow', 'r_compow');
    if (o.communists && o.emergency && o.antiPolicies && o.briefings) ref.push('r_contents');   // the contents card lists the full set
    longs.push(...ref.map((id) => both(id, 'Reference card', 'long')));
    count('Boards', 'Reference cards', ref.length);
  }
  const placards: Slot[] = o.placards
    ? (['chancellor', 'president'] as const).map((n) => ({ front: piece('pl_' + n, 0), back: { type: 'solid', rgb: PLACARD_BACK } as Face, name: n + ' placard', size: 'placard' as const }))
    : [];
  if (o.placards) count('Boards', 'Placards', 2);

  return { tiles, cards, ballots, longs, inserts, placards, counts, minPlayers: s.from };
}
