export type Paper = 'A3' | 'A4';

export interface PrintOptions {
  paper: Paper;
  /** largest table the set must cover */
  players: number;
  xl: boolean;
  communists: boolean;
  emergency: boolean;
  antiPolicies: boolean;
  /** optional XL roles that are switched on, by role id */
  roles: Record<string, boolean>;
  briefings: boolean;
  ballots: 'double' | 'separate';
  boards: boolean;
  inserts: boolean;
  referenceCards: boolean;
  placards: boolean;
  pileCards: boolean;
  blanks: boolean;
  /** ballots and borderless boards in their own PDF, for different paper */
  splitFiles: boolean;
  rulebook: boolean;
}

export const DEFAULT_OPTIONS: PrintOptions = {
  paper: 'A3',
  players: 19,
  xl: true,
  communists: true,
  emergency: true,
  antiPolicies: true,
  roles: Object.fromEntries(['centrist', 'capitalist', 'monarchist', 'anarchist', 'bodyguard', 'fascist_spy', 'liberal_spy', 'jester', 'propagandist', 'bureaucrat', 'detective'].map((k) => [k, true])),
  briefings: true,
  ballots: 'double',
  boards: true,
  inserts: true,
  referenceCards: true,
  placards: true,
  pileCards: true,
  blanks: true,
  splitFiles: true,
  rulebook: true,
};

/** Keeps the options consistent: what the rules allow at this table size and with these modules. */
export function normalise(o: PrintOptions, needsCommunists: (id: string) => boolean): PrintOptions {
  const n: PrintOptions = { ...o, roles: { ...o.roles } };
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
