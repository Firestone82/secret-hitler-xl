import { Role, RolesFile, SeatTable } from '../core/types';
import { PrintOptions, REF_CARDS, refCardAllowed } from './options';

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
  /** printed smaller than the piece's own size (small reference cards) */
  scale?: number;
  /** cut size in mm where the piece has a size of its own (borderless boards) */
  mm?: [number, number];
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
  /** small reference cards, laid out on their own sheets; board-sized ones go with the boards */
  refs: Slot[];
  placards: Slot[];
  counts: CountLine[];
  minPlayers: number;
}

// who sits at the table: defaults, replaced by the seat tables of the rulebook (data/rulebook/setup.json) once it loads
type Seats = Pick<SeatTable, 'from' | 'liberals' | 'fascists' | 'communists'>;
let BASE: Seats = { from: 5, liberals: [3, 4, 4, 5, 5, 6], fascists: [1, 1, 2, 2, 3, 3], communists: [0, 0, 0, 0, 0, 0] };
let XL: Seats = {
  from: 6,
  liberals: [3, 4, 4, 4, 5, 5, 6, 6, 7, 7, 7, 7, 8, 9],
  fascists: [1, 1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4],
  communists: [1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 4, 5, 5, 5],
};

/** Uses the seat tables from data/rulebook/setup.json, so the rulebook and the print builder agree. */
export function setSeatTables(t: { base: Seats; xl: Seats }) {
  BASE = t.base;
  XL = t.xl;
}

/** What the original Secret Hitler box already holds: left out when only the XL additions are printed. */
const ORIGINAL = { libTiles: 6, fasTiles: 11, libRoles: 6, fasRoles: 3, hitler: 1, libMembers: 6, fasMembers: 4, ballots: 10 };
/** Small reference cards: 280 × 95 mm instead of 395 × 134. */
export const SMALL_REF_SCALE = 280 / 395;
/** Borderless boards are the inner track and footer strip of each board in a narrow frame of its own, so each has its own size (cut size, mm).
 *  Made by tools/export/borderless_boards.py, which prints these numbers. */
export const INSERT_MM: Record<string, [number, number]> = {
  liberal: [291.9, 106.0], 'fascist_5-6': [345.7, 103.9], 'fascist_7-8': [345.7, 103.9], 'fascist_9-10': [345.7, 103.9], communist: [345.1, 102.2],
};

const EMERGENCY = ['investigate', 'peek', 'special_election', 'execution', 'propaganda', 'no_confidence', 'censorship', 'enabling_act', 'article48', 'pardon'];
const PLACARD_BACK: [number, number, number] = [224, 146, 39];

const piece = (id: string, page: 0 | 1 = 0): Face => ({ type: 'piece', id, page });
const both = (id: string, name: string, size: Slot['size']): Slot => ({ front: piece(id, 0), back: piece(id, 1), name, size });
const times = <T>(n: number, f: (i: number) => T): T[] => Array.from({ length: Math.max(0, n) }, (_, i) => f(i));

export function seats(o: PrintOptions) {
  const t = o.xl && o.communists ? XL : BASE;
  let lib = 0, fas = 0, com = 0;
  for (let p = t.from; p <= o.players; p++) {
    const i = p - t.from;
    if (i >= t.liberals.length) break;
    lib = Math.max(lib, t.liberals[i]); fas = Math.max(fas, t.fascists[i]); com = Math.max(com, t.communists[i] ?? 0);
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
  const sp = o.spares, own = o.base ? null : ORIGINAL;
  const less = (n: number, owned = 0) => Math.max(0, n - owned);
  const nLib = less(6, own?.libTiles) + (o.communists ? 1 : 0) + sp.tiles, nFas = less(11, own?.fasTiles) + sp.tiles, nCom = o.communists ? 10 + sp.tiles : 0;
  tiles.push(...times(nLib, () => both('policies/liberal', 'Liberal policy', 'tile')));
  tiles.push(...times(nFas, () => both('policies/fascist', 'Fascist policy', 'tile')));
  tiles.push(...times(nCom, () => both('policies/communist', 'Communist policy', 'tile')));
  count('Policy tiles', 'Liberal policies', nLib); count('Policy tiles', 'Fascist policies', nFas); count('Policy tiles', 'Communist policies', nCom);
  if (o.emergency) { for (const e of EMERGENCY) tiles.push(both('powers/' + e, 'Emergency power', 'tile')); count('Policy tiles', 'Emergency powers', 10); }
  if (o.antiPolicies) { for (const a of ['policies/anti_fascist', 'policies/anti_communist', 'policies/social_democratic']) tiles.push(both(a, 'Anti-policy', 'tile')); count('Policy tiles', 'Anti-policies', 3); }
  const capitalist = extras.some((r) => r.id === 'capitalist');
  if (capitalist) { tiles.push(both('policies/lobby', 'Lobby card (small)', 'tile')); count('Policy tiles', 'Small Lobby card', 1); }
  if (o.blanks) {
    const b = ['policies/blank_liberal', 'policies/blank_fascist', ...(o.communists ? ['policies/blank_communist'] : []), ...(o.emergency ? ['powers/blank'] : [])];
    tiles.push(...b.map((id) => both(id, 'Blank tile', 'tile'))); count('Policy tiles', 'Blank tiles', b.length);
  }

  // ---- role cards: enough regular roles for the largest table, plus one card per optional role.
  // Without the original pieces the cards its box holds are not printed, but they still get a briefing.
  const roleCards: { role: Role; art: string; owned: boolean; briefed?: boolean }[] = [];
  const regular = (id: string, n: number, owned = 0) => {
    const r = byId(id);
    for (let i = 0; i < n; i++) roleCards.push({ role: r, art: r.art[i % r.art.length], owned: i < owned });
    return less(n, owned);
  };
  const nLibR = regular('liberal', s.lib + sp.roles, own?.libRoles), nFasR = regular('fascist', s.fas + sp.roles, own?.fasRoles);
  // Hitler: one briefing, and one card of the chosen art, or one of every art to pick from at the table
  const hitler = byId('hitler');
  const hitlerArts = o.hitlerArt === 'all' ? hitler.art : [hitler.art.includes(o.hitlerArt) ? o.hitlerArt : hitler.art[0]];
  hitlerArts.forEach((art, i) => roleCards.push({ role: hitler, art, owned: i < (own?.hitler ?? 0), briefed: i === 0 }));
  const nHit = less(hitlerArts.length, own?.hitler);
  const nComR = o.communists ? regular('communist', s.com + sp.roles) : 0;
  for (const r of extras) for (let i = 0; i < r.count; i++) roleCards.push({ role: r, art: r.art[i % r.art.length], owned: false });
  count('Roles', 'Liberal roles', nLibR); count('Roles', 'Fascist roles', nFasR); count('Roles', 'Hitler', nHit);
  count('Roles', 'Communist roles', nComR);
  for (const r of extras) count('Roles', r.name + (r.count > 1 ? 's' : ''), r.count);

  const cards: Slot[] = [];
  const roleSlots = roleCards.filter((c) => !c.owned).map(({ role, art }) => ({ front: piece(art, 0), back: piece(art, 1), name: role.name + ' role', size: 'card' as const }));
  const briefSlots = o.briefings ? roleCards.filter((c) => c.briefed !== false).map(({ role }) => ({ front: { type: 'briefing', role: role.id } as Face, back: piece('briefing/back', 0), name: role.name + ' briefing', size: 'card' as const })) : [];
  if (o.briefings) count('Roles', 'Role Briefing cards', briefSlots.length);

  // ---- party membership: every seat plus the cards the rules hand out on top
  const mem = { liberal: less(s.lib, own?.libMembers) + sp.memberships, fascist: less(s.fas + 1, own?.fasMembers) + sp.memberships, communist: o.communists ? s.com + 2 + sp.memberships : 0, lobby: 0 };
  for (const r of extras) for (const [k, v] of Object.entries(r.extraMembership ?? {})) (mem as any)[k] += v;
  const memSlots: Slot[] = [
    ...times(mem.liberal, () => both('membership/liberal', 'Liberal membership', 'card')),
    ...times(mem.fascist, () => both('membership/fascist', 'Fascist membership', 'card')),
    ...times(mem.communist, () => both('membership/communist', 'Communist membership', 'card')),
    ...times(mem.lobby, () => both('membership/lobby', 'Lobby card', 'card')),
  ];
  count('Party Membership', 'Liberal', mem.liberal); count('Party Membership', 'Fascist', mem.fascist);
  count('Party Membership', 'Communist', mem.communist); count('Party Membership', 'Lobby card', mem.lobby);

  // ---- ballots: one per player, plus any spares the user asks for
  const ballots: Slot[] = [], nBallot = less(o.players, own?.ballots) + sp.ballots;
  if (o.ballots === 'double') {
    ballots.push(...times(nBallot, () => both('ballots/ja_nein', 'Ballot', 'card')));
    count('Ballots', 'Ballots, Ja! front / Nein back', nBallot);
  } else {
    ballots.push(...times(nBallot, () => both('ballots/ja', 'Ja! ballot', 'card')), ...times(nBallot, () => both('ballots/nein', 'Nein ballot', 'card')));
    count('Ballots', 'Ja! ballots', nBallot); count('Ballots', 'Nein ballots', nBallot);
  }

  const extraCards: Slot[] = [];
  if (o.pileCards && o.base) { extraCards.push(both('piles/draw', 'Draw pile card', 'card'), both('piles/discard', 'Discard pile card', 'card')); count('Other cards', 'Draw and discard pile cards', 2); }
  if (o.blanks) {
    const pals: [string, string][] = [['liberal', 'lib'], ['fascist', 'fas'], ...(o.communists ? [['communist', 'com'] as [string, string]] : []), ['neutral', 'neu']];
    for (const [k] of pals) extraCards.push(both('roles/blank_' + k, 'Blank role', 'card'));
    if (o.briefings) for (const [, p] of pals) extraCards.push({ front: { type: 'blankBriefing', palette: p }, back: piece('briefing/back', 0), name: 'Blank briefing', size: 'card' });
    extraCards.push(both('membership/blank', 'Blank membership', 'card'), both('membership/blank', 'Blank membership', 'card'));
    count('Other cards', 'Blank roles' + (o.briefings ? ' + briefings' : ''), pals.length * (o.briefings ? 2 : 1));
    count('Other cards', 'Blank memberships', 2);
  }
  cards.push(...roleSlots, ...briefSlots, ...memSlots, ...extraCards);

  // ---- boards and reference cards
  const longs: Slot[] = [];
  // the original box has the Liberal and Fascist boards, but not the borderless ones for the frames
  const boards: [string, string, boolean][] = [['liberal', 'Liberal board', true]];
  if (s.from <= 6) boards.push(['fascist_5-6', 'Fascist board 5-6', true]);
  if (o.players >= 7) boards.push(['fascist_7-8', 'Fascist board 7-8', true]);
  if (o.players >= 9) boards.push(['fascist_9-10', 'Fascist board 9+', true]);
  if (o.communists) boards.push(['communist', 'Communist board', false]);
  const border = o.boardStyle !== 'borderless', borderless = o.boardStyle !== 'border';
  if (border) {
    const printed = boards.filter(([, , original]) => o.base || !original);
    for (const [k, n] of printed) longs.push(both('boards/' + k, n, 'long'));
    count('Boards', 'Boards with border', printed.length);
  }
  const inserts: Slot[] = borderless ? boards.map(([k, n]) => ({ ...both('boards/borderless/' + k, n + ' (borderless)', 'insert'), mm: INSERT_MM[k] })) : [];
  if (borderless) count('Boards', 'Borderless boards', inserts.length);
  const refs: Slot[] = [], small = o.refSize === 'small';
  for (const r of REF_CARDS) {
    const n = refCardAllowed(r, o) ? o.refCards[r.id] ?? 0 : 0;
    const slot = (): Slot => (small ? { ...both(r.id, 'Reference card', 'long'), scale: SMALL_REF_SCALE } : both(r.id, 'Reference card', 'long'));
    (small ? refs : longs).push(...times(n, slot));
    count('Reference cards', r.label, n);
  }
  const placards: Slot[] = o.placards && o.base
    ? (['chancellor', 'president'] as const).map((n) => ({ front: piece('placards/' + n, 0), back: { type: 'solid', rgb: PLACARD_BACK } as Face, name: n + ' placard', size: 'placard' as const }))
    : [];
  count('Boards', 'Placards', placards.length);

  return { tiles, cards, ballots, longs, inserts, refs, placards, counts, minPlayers: s.from };
}

/** A piece that the plan needs, once per distinct design, with the number of copies. */
export interface UniquePiece { group: string; slot: Slot; copies: number }

/** The plan's pieces grouped by kind and design: what a print service needs as separate files. */
export function uniquePieces(plan: Plan): UniquePiece[] {
  const groups: [string, Slot[]][] = [
    ['tiles', plan.tiles], ['cards', plan.cards], ['ballots', plan.ballots],
    ['boards', plan.longs], ['borderless_boards', plan.inserts], ['reference_cards', plan.refs], ['placards', plan.placards],
  ];
  const out: UniquePiece[] = [];
  for (const [group, slots] of groups) {
    const seen = new Map<string, UniquePiece>();
    for (const slot of slots) {
      const k = JSON.stringify([slot.size, slot.scale, slot.mm, slot.front, slot.back]);
      const u = seen.get(k);
      if (u) u.copies++;
      else { const n = { group, slot, copies: 1 }; seen.set(k, n); out.push(n); }
    }
  }
  return out;
}
