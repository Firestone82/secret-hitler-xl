export type Paper = 'A3' | 'A4';
export type BoardStyle = 'border' | 'borderless' | 'both';
/** board: as large as a board; small: 280 × 95 mm, stacked on A3 or two to an A4 sheet */
export type RefSize = 'board' | 'small';
export type SpareKind = 'tiles' | 'roles' | 'memberships' | 'ballots';

/** The reference cards, in print order, with what each needs and how many a table usually wants. */
export const REF_CARDS: { id: string; label: string; hint: string; copies: number; needs?: 'powers' | 'communists' | 'full' }[] = [
  { id: 'r_setupnight', label: 'Setup and night script', hint: 'For whoever runs the night.', copies: 1 },
  { id: 'r_round', label: 'Round', hint: 'The order of a round.', copies: 2 },
  { id: 'r_emerg', label: 'Emergency powers and anti-policies', hint: 'Needs emergency powers or anti-policies.', copies: 2, needs: 'powers' },
  { id: 'r_compow', label: 'Communist powers and winning', hint: 'Needs the Communists.', copies: 2, needs: 'communists' },
  { id: 'r_contents', label: 'Contents', hint: 'Lists the full set: needs every module and the briefings.', copies: 1, needs: 'full' },
];

export const SPARE_KINDS: { k: SpareKind; label: string; hint: string }[] = [
  { k: 'tiles', label: 'Policy tiles', hint: 'per party' },
  { k: 'roles', label: 'Regular roles', hint: 'Liberal, Fascist, Communist' },
  { k: 'memberships', label: 'Party Membership', hint: 'per party' },
  { k: 'ballots', label: 'Ballots', hint: 'besides the one spare' },
];

export interface PrintOptions {
  paper: Paper;
  /** largest table the set must cover */
  players: number;
  /** the pieces the original Secret Hitler box already has; off prints only what XL adds on top */
  base: boolean;
  xl: boolean;
  communists: boolean;
  emergency: boolean;
  antiPolicies: boolean;
  /** optional XL roles that are switched on, by role id */
  roles: Record<string, boolean>;
  briefings: boolean;
  ballots: 'double' | 'separate';
  /** border: the classic boards; borderless: for the 3D-printed frames; both */
  boardStyle: BoardStyle;
  /** copies of each reference card, by piece id (r_round…); 0 leaves it out */
  refCards: Record<string, number>;
  refSize: RefSize;
  /** spare copies on top of what the table needs, by kind */
  spares: Record<SpareKind, number>;
  placards: boolean;
  pileCards: boolean;
  blanks: boolean;
  /** ballots and borderless boards in their own PDF, for different paper */
  splitFiles: boolean;
  rulebook: boolean;
  /** sheets: imposed sheets to print at home; pieces: one PDF per piece and side, for print services */
  output: 'sheets' | 'pieces';
  /** pieces only: repeat the files for every copy instead of putting the count in the file name */
  perCopy: boolean;
}

export const DEFAULT_OPTIONS: PrintOptions = {
  paper: 'A3',
  players: 19,
  base: true,
  xl: true,
  communists: true,
  emergency: true,
  antiPolicies: true,
  roles: Object.fromEntries(['centrist', 'capitalist', 'monarchist', 'anarchist', 'bodyguard', 'fascist_spy', 'liberal_spy', 'jester', 'propagandist', 'bureaucrat', 'detective'].map((k) => [k, true])),
  briefings: true,
  ballots: 'double',
  boardStyle: 'border',
  refCards: Object.fromEntries(REF_CARDS.map((r) => [r.id, r.copies])),
  refSize: 'board',
  spares: { tiles: 0, roles: 0, memberships: 0, ballots: 0 },
  placards: true,
  pileCards: true,
  blanks: true,
  splitFiles: true,
  rulebook: true,
  output: 'sheets',
  perCopy: false,
};

/** Keeps the options consistent: what the rules allow at this table size and with these modules. */
export function normalise(o: PrintOptions, needsCommunists: (id: string) => boolean): PrintOptions {
  const { insertScale: _, ...rest } = o as PrintOptions & { insertScale?: number };   // no longer an option
  const n: PrintOptions = { ...rest, roles: { ...o.roles }, refCards: { ...DEFAULT_OPTIONS.refCards, ...o.refCards }, spares: { ...DEFAULT_OPTIONS.spares, ...o.spares } };
  if (!['border', 'borderless', 'both'].includes(n.boardStyle)) n.boardStyle = 'border';
  if (n.refSize !== 'small') n.refSize = 'board';
  n.base = n.base !== false || !n.xl;
  const clamp = (v: unknown, max: number) => Math.min(max, Math.max(0, Math.round(Number(v) || 0)));
  for (const k of Object.keys(n.refCards)) n.refCards[k] = clamp(n.refCards[k], 9);
  for (const k of Object.keys(n.spares) as SpareKind[]) n.spares[k] = clamp(n.spares[k], 9);
  if (!n.xl) {
    n.communists = n.emergency = n.antiPolicies = false;
    for (const k of Object.keys(n.roles)) n.roles[k] = false;
  }
  if (!n.communists) {
    n.emergency = false;
    for (const k of Object.keys(n.roles)) if (needsCommunists(k)) n.roles[k] = false;
  }
  const max = n.communists ? 19 : 10;
  const min = n.xl && n.communists ? 6 : 5;
  n.players = Math.min(max, Math.max(min, Math.round(n.players)));
  // the two spies always come together
  n.roles['liberal_spy'] = n.roles['fascist_spy'] = !!(n.roles['liberal_spy'] || n.roles['fascist_spy']) && n.xl;
  return n;
}

/** Whether a reference card makes sense with these modules. */
export function refCardAllowed(r: (typeof REF_CARDS)[number], o: PrintOptions): boolean {
  if (!o.xl) return false;
  if (r.needs === 'powers') return o.emergency || o.antiPolicies;
  if (r.needs === 'communists') return o.communists;
  if (r.needs === 'full') return o.communists && o.emergency && o.antiPolicies && o.briefings;
  return true;
}
