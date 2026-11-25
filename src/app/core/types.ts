export interface Palette {
  header: string;
  headerText: string;
  accent: string;
  paper: string;
}

export interface BriefingSection {
  label: string;
  items: string[];
}

export interface RoleRulebook {
  title: string;
  teamLabel: string;
  image: string;
  paragraphs: string[];
  addWhen: string;
  addWhenTable?: string;
  /** optional roles: one line on what the role changes at the table, shown in the print builder */
  pitch?: string;
  seatLabel?: string;
}

export interface Role {
  id: string;
  name: string;
  /** base = original game, communists = the Communist party, roles = an optional XL role */
  module: 'base' | 'communists' | 'roles';
  palette: string;
  party: string;
  regular: boolean;
  seat: string | null;
  seatLabel: string | null;
  count: number;
  countLabel: string | null;
  pair: string | null;
  withCommunists: boolean;
  needsCommunists: boolean;
  extraMembership: Record<string, number> | null;
  art: string[];
  portrait: string;
  crop: [number, number, number];
  briefing: { side: string; card: string; sections: BriefingSection[] };
  rulebook: RoleRulebook | null;
}

export interface RolesFile {
  palettes: Record<string, Palette>;
  roles: Role[];
  blank: { sections: { label: string; lines: number }[] };
}

export interface PieceInfo {
  kind: 'tile' | 'card' | 'long' | 'insert' | 'placard';
  w: number;
  h: number;
  label: string;
}

/** One block of the rulebook, as exported from the rule source. */
export interface Block {
  type: string;
  id?: string;
  /** shown with an "Experimental" mark: rules that are not settled yet */
  experimental?: boolean;
  [k: string]: any;
}

/** Who sits at the table, one entry per player count from `from` upwards. */
export interface SeatTable {
  from: number;
  /** first player count whose numbers are experimental, or null */
  experimentalFrom: number | null;
  liberals: number[];
  fascists: number[];
  hitler: number[];
  communists: number[];
  /** emergency tiles in the deck, or null when the table has none */
  emergency: number[] | null;
  /** which Fascist board to use, or null when it is not part of the table */
  fascistBoard: string[] | null;
}

export interface RulebookVersion {
  version: string;
  date: string;
  changes: string[];
}

export interface RulebookFile {
  /** version of the rule text, shown on the site and in print */
  version: string;
  date: string;
  changelog: RulebookVersion[];
  downloads: { label: string; file: string }[];
  setup: { base: SeatTable; xl: SeatTable };
  blocks: Block[];
}
