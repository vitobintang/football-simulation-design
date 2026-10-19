import type { Ab, FormationId, PlayStyleId, Pos } from "./types";

export const BUDGET = 100;

export const POS_LIST: Pos[] = ["GK", "CB", "FB", "CM", "WM", "WF", "ST"];

/** Trading lines: keepers / defenders / midfielders / attackers. Deals happen within a line. */
export const POS_GROUP: Record<Pos, "GK" | "DEF" | "MID" | "ATT"> = {
  GK: "GK",
  CB: "DEF",
  FB: "DEF",
  CM: "MID",
  WM: "MID",
  WF: "ATT",
  ST: "ATT",
};

export const GROUP_LABEL: Record<string, string> = {
  GK: "keepers",
  DEF: "defenders",
  MID: "midfielders",
  ATT: "attackers",
};

export const sameLine = (a: Pos, b: Pos) => POS_GROUP[a] === POS_GROUP[b];

/** Sensible secondary positions each position can grow into. */
export const POS_NEIGHBORS: Record<Pos, Pos[]> = {
  GK: [],
  CB: ["FB"],
  FB: ["CB", "WM"],
  CM: ["WM"],
  WM: ["CM", "WF", "FB"],
  WF: ["WM", "ST"],
  ST: ["WF"],
};

export const POS_LABEL: Record<Pos, string> = {
  GK: "Keeper",
  CB: "Centre-Back",
  FB: "Full-Back",
  CM: "Centre-Mid",
  WM: "Wide-Mid",
  WF: "Winger",
  ST: "Striker",
};

export const AB_LABELS: [keyof Ab, string][] = [
  ["a", "Attack"],
  ["d", "Defense"],
  ["p", "Passing"],
  ["dr", "Dribble"],
  ["pa", "Pace"],
  ["v", "Vision"],
  ["s", "Shooting"],
  ["ph", "Physicality"],
];

export const GK_LABELS: [keyof { dive: number; pass: number; reflex: number; phys: number }, string][] = [
  ["dive", "Diving"],
  ["pass", "Passing"],
  ["reflex", "Reflex"],
  ["phys", "Physicality"],
];

export interface SlotDef {
  pos: Pos;
  x: number;
  y: number;
}

export const FORMATIONS: Record<FormationId, { label: string; slots: SlotDef[] }> = {
  "4-4-2": {
    label: "4-4-2",
    slots: [
      { pos: "GK", x: 50, y: 7 },
      { pos: "FB", x: 14, y: 23 },
      { pos: "CB", x: 37, y: 18 },
      { pos: "CB", x: 63, y: 18 },
      { pos: "FB", x: 86, y: 23 },
      { pos: "WM", x: 12, y: 47 },
      { pos: "CM", x: 38, y: 42 },
      { pos: "CM", x: 62, y: 42 },
      { pos: "WM", x: 88, y: 47 },
      { pos: "ST", x: 38, y: 70 },
      { pos: "ST", x: 62, y: 70 },
    ],
  },
  "4-3-3": {
    label: "4-3-3",
    slots: [
      { pos: "GK", x: 50, y: 7 },
      { pos: "FB", x: 14, y: 23 },
      { pos: "CB", x: 37, y: 18 },
      { pos: "CB", x: 63, y: 18 },
      { pos: "FB", x: 86, y: 23 },
      { pos: "CM", x: 30, y: 43 },
      { pos: "CM", x: 50, y: 38 },
      { pos: "CM", x: 70, y: 43 },
      { pos: "WF", x: 13, y: 65 },
      { pos: "ST", x: 50, y: 73 },
      { pos: "WF", x: 87, y: 65 },
    ],
  },
  "4-2-3-1": {
    label: "4-2-3-1",
    slots: [
      { pos: "GK", x: 50, y: 7 },
      { pos: "FB", x: 14, y: 23 },
      { pos: "CB", x: 37, y: 18 },
      { pos: "CB", x: 63, y: 18 },
      { pos: "FB", x: 86, y: 23 },
      { pos: "CM", x: 38, y: 38 },
      { pos: "CM", x: 62, y: 38 },
      { pos: "WF", x: 14, y: 59 },
      { pos: "CM", x: 50, y: 56 },
      { pos: "WF", x: 86, y: 59 },
      { pos: "ST", x: 50, y: 75 },
    ],
  },
  "3-5-2": {
    label: "3-5-2",
    slots: [
      { pos: "GK", x: 50, y: 7 },
      { pos: "CB", x: 26, y: 18 },
      { pos: "CB", x: 50, y: 15 },
      { pos: "CB", x: 74, y: 18 },
      { pos: "WM", x: 8, y: 45 },
      { pos: "CM", x: 32, y: 40 },
      { pos: "CM", x: 50, y: 35 },
      { pos: "CM", x: 68, y: 40 },
      { pos: "WM", x: 92, y: 45 },
      { pos: "ST", x: 40, y: 69 },
      { pos: "ST", x: 60, y: 69 },
    ],
  },
  "5-3-2": {
    label: "5-3-2",
    slots: [
      { pos: "GK", x: 50, y: 7 },
      { pos: "FB", x: 8, y: 27 },
      { pos: "CB", x: 30, y: 17 },
      { pos: "CB", x: 50, y: 14 },
      { pos: "CB", x: 70, y: 17 },
      { pos: "FB", x: 92, y: 27 },
      { pos: "CM", x: 32, y: 45 },
      { pos: "CM", x: 50, y: 40 },
      { pos: "CM", x: 68, y: 45 },
      { pos: "ST", x: 40, y: 69 },
      { pos: "ST", x: 60, y: 69 },
    ],
  },
  "3-4-3": {
    label: "3-4-3",
    slots: [
      { pos: "GK", x: 50, y: 7 },
      { pos: "CB", x: 26, y: 17 },
      { pos: "CB", x: 50, y: 14 },
      { pos: "CB", x: 74, y: 17 },
      { pos: "WM", x: 10, y: 45 },
      { pos: "CM", x: 40, y: 39 },
      { pos: "CM", x: 60, y: 39 },
      { pos: "WM", x: 90, y: 45 },
      { pos: "WF", x: 16, y: 66 },
      { pos: "ST", x: 50, y: 73 },
      { pos: "WF", x: 84, y: 66 },
    ],
  },
};

export const FORMATION_IDS = Object.keys(FORMATIONS) as FormationId[];

/** How well a player of position P performs in slot S. */
export const POS_FIT: Record<Pos, Record<Pos, number>> = {
  GK: { GK: 1, CB: 0.5, FB: 0.5, CM: 0.5, WM: 0.5, WF: 0.5, ST: 0.5 },
  CB: { CB: 1, FB: 0.92, CM: 0.87, WM: 0.74, WF: 0.68, ST: 0.66, GK: 0.4 },
  FB: { FB: 1, WM: 0.93, CB: 0.9, WF: 0.84, CM: 0.82, ST: 0.65, GK: 0.4 },
  CM: { CM: 1, WM: 0.92, CB: 0.86, FB: 0.86, WF: 0.8, ST: 0.72, GK: 0.4 },
  WM: { WM: 1, WF: 0.93, FB: 0.9, CM: 0.88, CB: 0.76, ST: 0.74, GK: 0.4 },
  WF: { WF: 1, WM: 0.92, ST: 0.9, FB: 0.82, CM: 0.78, CB: 0.64, GK: 0.4 },
  ST: { ST: 1, WF: 0.92, WM: 0.85, CM: 0.84, FB: 0.66, CB: 0.62, GK: 0.4 },
};

export interface StyleDef {
  label: string;
  short: string;
  desc: string;
  att: number;
  def: number;
  tempo: number;
  fatigue: number;
  /** which slot positions this style depends on */
  keySlots: Pos[];
  /** how important each slot is to the style */
  weights: Partial<Record<Pos, number>>;
  /** which ability those key players must have (or special) */
  keyStat: (p: { ab: Ab }) => number;
  keyNote: string;
}

export const STYLES: Record<PlayStyleId, StyleDef> = {
  possession: {
    label: "Tiki-Taka",
    short: "Tiki-Taka",
    desc: "Total possession football. Everyone must be comfortable on the ball — even the centre-backs — but the engine room is midfield. Poor passers give it away.",
    att: 1.06,
    def: 1.0,
    tempo: 0.92,
    fatigue: 0.95,
    keySlots: ["CM", "WM", "CB", "FB", "WF", "ST"],
    weights: { CM: 2, WM: 1.6, FB: 1, CB: 1, WF: 1, ST: 0.7 },
    keyStat: (p) => p.ab.p,
    keyNote: "team passing, midfield-first",
  },
  wing: {
    label: "Wing Play",
    short: "Wing Play",
    desc: "Attack down the flanks, cross early, overload wide. Lives or dies by your wingers and overlapping full-backs.",
    att: 1.05,
    def: 0.99,
    tempo: 1.06,
    fatigue: 1.05,
    keySlots: ["WF", "FB", "WM"],
    weights: { WF: 2, FB: 1.4, WM: 1.2 },
    keyStat: (p) => (p.ab.dr + p.ab.pa) / 2,
    keyNote: "wingers & overlapping full-backs",
  },
  press: {
    label: "High Press",
    short: "Press",
    desc: "Hunt in packs high up the pitch. The whole spine must press — forwards trigger it, midfielders squeeze, full-backs jump. Burns energy.",
    att: 1.08,
    def: 1.04,
    tempo: 1.14,
    fatigue: 1.5,
    keySlots: ["CM", "ST", "WF", "FB", "CB"],
    weights: { CM: 1.6, ST: 1.2, WF: 1.2, FB: 0.9, CB: 0.5 },
    keyStat: (p) => (p.ab.d + p.ab.a) / 2,
    keyNote: "pressing intensity through the spine",
  },
  counter: {
    label: "Counter Attack",
    short: "Counter",
    desc: "Absorb, win it, explode forward in three passes. Built for rapid wingers and strikers — and one midfielder who can launch it.",
    att: 1.0,
    def: 1.03,
    tempo: 1.05,
    fatigue: 0.9,
    keySlots: ["WF", "ST", "WM", "CM"],
    weights: { WF: 1.8, ST: 1.6, WM: 1.2, CM: 0.8 },
    keyStat: (p) => p.ab.pa,
    keyNote: "explosive pace in the front line",
  },
  longball: {
    label: "Direct Long Ball",
    short: "Direct",
    desc: "Bypass midfield, target the big men, win the second ball. Needs dominant centre-backs and a striker who bullies people.",
    att: 0.98,
    def: 0.99,
    tempo: 1.08,
    fatigue: 1.05,
    keySlots: ["CB", "ST", "FB"],
    weights: { ST: 1.8, CB: 1.6, FB: 0.6 },
    keyStat: (p) => p.ab.ph,
    keyNote: "dominant centre-backs & a target man",
  },
  lowblock: {
    label: "Low Block",
    short: "Low Block",
    desc: "Park the bus. Two compact banks of four, nothing between the lines. Few chances for, even fewer against. Needs elite defenders.",
    att: 0.85,
    def: 1.18,
    tempo: 0.86,
    fatigue: 0.8,
    keySlots: ["CB", "FB", "CM"],
    weights: { CB: 1.8, FB: 1.3, CM: 0.8 },
    keyStat: (p) => p.ab.d,
    keyNote: "a deep, organised defensive line",
  },
};

export const STYLE_IDS = Object.keys(STYLES) as PlayStyleId[];

export const GROWTH_LABEL: Record<string, string> = {
  early: "Early Peak",
  mid: "Standard Curve",
  late: "Slow Bloomer",
  wonder: "One-Season Wonder",
  eternal: "Timeless",
  unique: "Wildcard",
};

/** Coherent coach pairings: style → formations that make sense for it. */
export const STYLE_FORMATIONS: Record<PlayStyleId, FormationId[]> = {
  possession: ["4-3-3", "4-2-3-1"],
  wing: ["4-3-3", "3-4-3"],
  press: ["4-3-3", "3-4-3", "4-2-3-1"],
  counter: ["4-2-3-1", "4-3-3", "5-3-2"],
  longball: ["4-4-2", "5-3-2"],
  lowblock: ["5-3-2", "4-4-2"],
};

const MATCHUP: Partial<Record<PlayStyleId, Partial<Record<PlayStyleId, number>>>> = {
  counter: { possession: 1.15, press: 1.1, lowblock: 0.9 },
  possession: { lowblock: 0.92, counter: 0.94, longball: 1.08 },
  press: { possession: 1.12, longball: 0.92, lowblock: 0.95 },
  longball: { lowblock: 1.06, press: 1.05 },
  lowblock: { counter: 1.06, longball: 1.04 },
  wing: { lowblock: 0.94, counter: 1.04, longball: 1.06 },
};

export function styleMatchup(att: PlayStyleId, def: PlayStyleId): number {
  return MATCHUP[att]?.[def] ?? 1;
}

export const CLUB_PREFIX = [
  "Ash", "Iron", "North", "East", "Port", "Mill", "Oak", "Raven", "Stone", "River",
  "Vale", "Harbor", "Falcon", "Crown", "Red", "Kings", "Wes", "Calder", "Brix", "Holly",
];

export const CLUB_SUFFIX = [
  "United", "City", "FC", "Rovers", "Athletic", "Wanderers", "Town", "Albion", "Rangers", "Sporting",
];

export const FIRST_NAMES = [
  "Luca", "Mateo", "Jonas", "Emil", "Rafael", "Dario", "Nico", "Andre", "Viktor", "Sam",
  "Theo", "Bruno", "Ivan", "Kofi", "Yusuf", "Diego", "Marco", "Elias", "Owen", "Tariq",
  "Felix", "Hugo", "Santi", "Milan", "Arda", "Pavel", "Rui", "Jonah", "Kai", "Enzo",
  "Adama", "Sergio", "Luka", "Noah", "Iker", "Bakary", "Casper", "Omar", "Lev", "Timo",
  "Aldo", "Renan", "Gustav", "Zeki", "Pablo", "Dane", "Ilya", "Mario", "Sekou", "Fynn",
];

export const LAST_NAMES = [
  "Moretti", "Kovac", "Lindgren", "Silva", "Traore", "Novak", "Fischer", "Costa", "Bakker", "Onana",
  "Petrov", "Sandoval", "Eriksen", "Duarte", "Mendes", "Krol", "Bianchi", "Ferreira", "Sato", "Weber",
  "Diallo", "Castro", "Nilsen", "Varga", "Romero", "Keita", "Osei", "Larsen", "Popescu", "Marchetti",
  "Herrera", "Okoro", "Berg", "Toure", "Vidal", "Keller", "Santos", "Moussa", "Riva", "Jansen",
  "Cabral", "Steiner", "Fofana", "Vieri", "Kone", "Brandt", "Serra", "Duku", "Nyland", "Okafor",
];

export const NATIONS = ["BRA", "ARG", "GER", "ESP", "FRA", "ITA", "POR", "NED", "NGA", "GHA", "JPN", "KOR", "CRO", "URU", "BEL", "DEN"];

export const COACH_NAMES = [
  "Vlado Brnic", "Sergio Duarte", "Henk Visser", "Marco Tardi", "Ola Nilsen", "Rachid Benali",
  "Gunter Faux", "Pep Roig", "Dan Petrescu", "Ivo Karlov", "Sam Coltrane", "Tito Veron",
  "Nico Sarte", "Bruno Keller", "Ilya Vukic", "Mateo Ferro", "Jan Olbrecht", "Cesar Lumo",
  "Erik Halden", "Rafa Duarte", "Momo Sissoko", "Paulo Vinte", "Stefan Baro", "Ali Cengiz",
];

export const CLUB_COLORS: [string, string][] = [
  ["#C8402F", "#F2E8D8"],
  ["#20543B", "#E8DFC8"],
  ["#2E4A78", "#E9E2D2"],
  ["#7A1F2B", "#F0C84B"],
  ["#D88A1E", "#241F1A"],
  ["#3B3F8C", "#E8E4DA"],
  ["#1E1E24", "#C8A44E"],
  ["#5E3A8C", "#EFE9DC"],
  ["#0E6E6E", "#F0EAD8"],
  ["#A84A20", "#F4EFE2"],
  ["#424242", "#D84B3A"],
  ["#276243", "#D8B84A"],
  ["#8C2E5A", "#EDE4D4"],
  ["#356B9E", "#D8D2C4"],
  ["#B0342C", "#2C2A26"],
  ["#4E5D28", "#EFE8D2"],
  ["#0F5C4C", "#E8D9B0"],
  ["#C05621", "#F4E9D8"],
  ["#44318D", "#E4DFF2"],
  ["#7B2D26", "#D9C9A3"],
];

export const CREST_VARIANTS = 5;

export const HANDLES = [
  "@MercatoPrime", "@TheGafferFeed", "@RouteOneRanter", "@TikiTakaTina", "@ScoutKingHQ",
  "@DeadlineDaye", "@CurvaUltra", "@xG_Overlord", "@GoonerLogic", "@ParkingTheBus",
  "@FabrizioRomers", "@CopeCentral", "@MemeUnitedFC", "@RondoTierLists", "@GriddyWatch",
  "@SundayLeagueScout", "@TheFootballCope", "@VAR_Apologist", "@BottleJobBulletin",
];

export const GOAL_TEXTS = [
  "{s} buries it low into the corner!",
  "{s} smashes it home from the edge of the box!",
  "{s} slots it coolly past the keeper!",
  "GOAL! {s} finishes a sweeping move!",
  "{s} powers a header into the net!",
  "{s} cuts inside and curls it in!",
  "{s} taps it in at the back post!",
  "What a strike! {s} rockets it top corner!",
  "{s} meets the cross and hammers it in!",
];

export const SAVE_TEXTS = [
  "{s} shoots — the keeper flies to tip it away!",
  "{s} strikes it — brilliant save!",
  "Denied! {s}'s effort is clawed out.",
  "{s} tests the keeper, who holds firm.",
];

export const WIDE_TEXTS = [
  "{s} drags the effort just wide.",
  "{s} shoots over the bar from range.",
  "Close! {s} misses the target by inches.",
  "{s} blazes it into the stands.",
];

export const BLOCK_TEXTS = [
  "{s} shoots — a defender throws himself in the way!",
  "Blocked! {s}'s drive is smothered.",
  "{s} finds only a wall of defenders.",
  "The cross comes in — cleared under pressure.",
];

export const TACKLE_TEXTS = [
  "{s} wins it back with a crunching tackle on {o}!",
  "Superb read from {s} — he strips {o} clean.",
  "{s} slides in and takes the ball off {o}. Textbook.",
  "{s} mugs {o} for possession in midfield!",
];

export const COMMENT_TEXTS = [
  "Facts. No debate.",
  "He's cooked. I said what I said. 🍳",
  "Source: trust me bro.",
  "The ref saw nothing. As always.",
  "Ballon d'our loading… 🐐",
  "Delete this.",
  "Tactical masterclass incoming, mark my words.",
  "My club would NEVER.",
  "xG doesn't lie, cope harder.",
  "And the formation still makes no sense.",
  "Enjoy the rebuild.",
  "This league is scripted and I'm tired.",
  "Scouts were there. I was the scout.",
  "ratio + L + no European nights",
  "bro thinks he's the main character 💀",
  "COACH KNOWS BALL. that's it. that's the post.",
  "petition to bench everyone, including the grass",
  "this isn't analysis, this is a cry for help",
  "he carried. he LITERALLY carried.",
  "delete the club",
  "trust the process (the process is losing)",
  "my uncle works at the club. it's worse than you think.",
  "sacked by morning. screenshot this.",
  "GOAT behavior. no notes. 🐐",
  "who allowed this man to have opinions",
];
