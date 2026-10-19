import {
  CLUB_COLORS,
  CLUB_PREFIX,
  CLUB_SUFFIX,
  COACH_NAMES,
  CREST_VARIANTS,
  FIRST_NAMES,
  FORMATIONS,
  LAST_NAMES,
  NATIONS,
  POS_FIT,
  POS_NEIGHBORS,
  STYLE_FORMATIONS,
  STYLE_IDS,
} from "./data";
import type {
  Ab,
  Club,
  Coach,
  CupRound,
  CupTie,
  Fixture,
  FormationId,
  GkAb,
  GrowthType,
  PlayStyleId,
  Player,
  Pos,
  Week,
} from "./types";

export const uid = () => Math.random().toString(36).slice(2, 10);
export const ri = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
export const rf = (a: number, b: number) => Math.random() * (b - a) + a;
export const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const gauss = () => (Math.random() + Math.random() + Math.random()) / 1.5 - 1;

const usedNames = new Set<string>();

export function personName(): string {
  for (let i = 0; i < 24; i++) {
    const n = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    if (!usedNames.has(n)) {
      usedNames.add(n);
      return n;
    }
  }
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)} ${pick(["Jr", "II", "III"])}`;
}

/** Position-weighted overall rating. */
export function ovr(p: Player): number {
  if (p.pos === "GK" && p.gk) {
    return Math.round(p.gk.dive * 0.35 + p.gk.reflex * 0.3 + p.gk.phys * 0.2 + p.gk.pass * 0.15);
  }
  const { a, d, p: pa, dr, pa: pace, v, s, ph } = p.ab;
  let r = 0;
  switch (p.pos) {
    case "ST":
      r = s * 0.28 + a * 0.2 + pace * 0.13 + ph * 0.1 + dr * 0.1 + v * 0.08 + pa * 0.06 + d * 0.05;
      break;
    case "WF":
      r = dr * 0.24 + pace * 0.2 + a * 0.18 + s * 0.1 + pa * 0.09 + v * 0.09 + ph * 0.05 + d * 0.05;
      break;
    case "WM":
      r = pa * 0.22 + v * 0.2 + pace * 0.15 + dr * 0.12 + a * 0.09 + d * 0.08 + ph * 0.07 + s * 0.07;
      break;
    case "CM":
      r = pa * 0.23 + v * 0.22 + d * 0.14 + a * 0.09 + ph * 0.09 + pace * 0.08 + dr * 0.08 + s * 0.07;
      break;
    case "FB":
      r = d * 0.28 + pace * 0.18 + ph * 0.16 + pa * 0.12 + v * 0.08 + a * 0.07 + dr * 0.06 + s * 0.05;
      break;
    case "CB":
      r = d * 0.32 + ph * 0.22 + pace * 0.1 + pa * 0.1 + v * 0.07 + s * 0.1 + a * 0.05 + dr * 0.04;
      break;
    default:
      r = (a + d + pa + dr + pace + v + s + ph) / 8;
  }
  return Math.round(r);
}

export function valueFor(r: number): number {
  if (r >= 82) return ri(18, 26);
  if (r >= 74) return ri(10, 16);
  if (r >= 66) return ri(5, 9);
  return ri(1, 4);
}

export function refreshValue(p: Player) {
  p.value = valueFor(ovr(p));
}

const GROWTH_WEIGHTS: [GrowthType, number][] = [
  ["early", 0.2],
  ["mid", 0.3],
  ["late", 0.18],
  ["wonder", 0.08],
  ["eternal", 0.09],
  ["unique", 0.15],
];

export function pickGrowth(): GrowthType {
  let r = Math.random();
  for (const [g, w] of GROWTH_WEIGHTS) {
    r -= w;
    if (r <= 0) return g;
  }
  return "mid";
}

const POS_BIAS: Record<Pos, Partial<Record<keyof Ab, number>>> = {
  ST: { s: 8, a: 6, d: -13, v: -2 },
  WF: { dr: 6, pa: 4, a: 3, d: -11, s: -2 },
  WM: { p: 5, v: 4, pa: 2, d: -5, s: -4 },
  CM: { p: 6, v: 5, d: 2, s: -5, dr: -1 },
  FB: { d: 6, pa: 4, ph: 2, s: -9, a: -6, dr: -2 },
  CB: { d: 8, ph: 5, s: -4, a: -9, dr: -4, pa: -2, v: -2 },
  GK: {},
};

export function genPlayer(pos: Pos, base: number, spread = 7, age?: number): Player {
  const mk = (bias: number) => clamp(Math.round(base + gauss() * spread + bias), 30, 95);
  const b = POS_BIAS[pos];
  const ab: Ab = {
    a: mk(b.a ?? 0),
    d: mk(b.d ?? 0),
    p: mk(b.p ?? 0),
    dr: mk(b.dr ?? 0),
    pa: mk(0),
    v: mk(b.v ?? 0),
    s: mk(b.s ?? 0),
    ph: mk(b.ph ?? 0),
  };
  const player: Player = {
    id: uid(),
    name: personName(),
    age: age ?? ri(18, 33),
    pos,
    nat: pick(NATIONS),
    ab,
    value: 0,
    pot: 0,
    growth: pickGrowth(),
    learn: {},
    hist: [],
  };
  // some players are naturally comfortable in a second position
  const neighbors = POS_NEIGHBORS[pos];
  if (neighbors.length && Math.random() < 0.35) player.pos2 = pick(neighbors);
  if (pos === "GK") {
    const g = (bias: number) => clamp(Math.round(base + gauss() * spread + bias), 30, 95);
    player.gk = { dive: g(2), reflex: g(2), phys: g(-1), pass: g(-4) };
  }
  player.pot = clamp(Math.max(ovr(player) + ri(2, 14), base + ri(4, 16)), 40, 96);
  player.hist = [ovr(player)];
  refreshValue(player);
  return player;
}

/** Exactly 11 players shaped for the given formation. */
export function genSquadFor(formation: FormationId, tier: number): Player[] {
  const base = [58, 63, 68, 74, 80][tier - 1];
  return FORMATIONS[formation].slots.map((slot) => genPlayer(slot.pos, base + ri(-1, 1)));
}

export function genCoach(style: PlayStyleId, name?: string): Coach {
  return { id: uid(), name: name ?? personName(), style, formation: pick(STYLE_FORMATIONS[style]) };
}

/** A pool of coaches — two per style, all equal ability, only style+formation differ. */
export function genCoachPool(count = 18): Coach[] {
  const names = shuffle(COACH_NAMES).slice(0, count);
  const pool: Coach[] = [];
  let i = 0;
  while (pool.length < count) {
    const style = STYLE_IDS[pool.length % STYLE_IDS.length];
    pool.push(genCoach(style, names[i++ % names.length]));
  }
  return shuffle(pool);
}

/** Club shells only — squads and coaches are generated AFTER the user drafts, so all clubs start "equal". */
export function genClubShells(): { shells: Club[]; lowerShells: Club[] } {
  usedNames.clear();
  const clubNames: string[] = [];
  const seen = new Set<string>();
  while (clubNames.length < 16) {
    const n = `${pick(CLUB_PREFIX)} ${pick(CLUB_SUFFIX)}`;
    const norm = n.toLowerCase().replace(/[^a-z]/g, "");
    if (!seen.has(norm)) {
      seen.add(norm);
      clubNames.push(n);
    }
  }
  const shorts = new Set<string>();
  const colors = shuffle(CLUB_COLORS);
  const mk = (name: string, i: number, lower?: boolean): Club => {
    // build a guaranteed-unique 3-letter code
    const letters = name.replace(/[^A-Za-z]/g, "").toUpperCase();
    let short = letters.slice(0, 3);
    let k = 3;
    while (shorts.has(short) && k < letters.length) {
      short = letters.slice(0, 2) + letters[k];
      k++;
    }
    let n2 = 1;
    while (shorts.has(short)) {
      short = letters.slice(0, 2) + String(n2 % 10);
      n2++;
    }
    shorts.add(short);
    return {
      id: uid(),
      name,
      short,
      colors: colors[i % colors.length],
      crest: ri(0, CREST_VARIANTS - 1),
      tier: 3,
      style: "counter",
      formation: "4-4-2",
      coach: { id: "", name: "", style: "counter", formation: "4-4-2" },
      players: [],
      morale: 55,
      lower,
    };
  };
  const shells = clubNames.slice(0, 12).map((n, i) => mk(n, i));
  const lowerShells = clubNames.slice(12, 16).map((n, i) => mk(n, 12 + i, true));
  return { shells, lowerShells };
}

/** Fill NPC clubs (and cup-only lower clubs) with a coach + 11 players AFTER the user drafts. */
export function populateNpcClubs(clubs: Club[], lower: Club[], coachPool: Coach[]): Coach[] {
  const tiers = shuffle([5, 5, 4, 4, 4, 3, 3, 3, 2, 2, 1, 1]);
  const pool = [...coachPool];
  const fill = (club: Club, tier: number) => {
    club.tier = tier;
    const coach = pool.pop() ?? genCoach(pick(STYLE_IDS));
    club.coach = coach;
    club.style = coach.style;
    club.formation = coach.formation;
    club.players = genSquadFor(coach.formation, tier);
    club.morale = 55;
  };
  clubs.forEach((club, i) => {
    if (club.isUser) {
      club.tier = 3;
      return;
    }
    fill(club, tiers[i]);
  });
  for (const club of lower) fill(club, 1);
  return pool;
}

/** Round-robin via circle method. */
export function genFixtures(ids: string[]): Fixture[][] {
  const n = ids.length;
  const arr = [...ids];
  const rounds: Fixture[][] = [];
  for (let r = 0; r < n - 1; r++) {
    const fixtures: Fixture[] = [];
    for (let i = 0; i < n / 2; i++) {
      const home = arr[i];
      const away = arr[n - 1 - i];
      fixtures.push(r % 2 === 0 ? { home, away, played: false, hg: 0, ag: 0 } : { home: away, away: home, played: false, hg: 0, ag: 0 });
    }
    rounds.push(fixtures);
    arr.splice(1, 0, arr.pop() as string);
  }
  const second = rounds.map((round) => round.map((f) => ({ home: f.away, away: f.home, played: false, hg: 0, ag: 0 })));
  return [...rounds, ...second];
}

export function genCup(topIds: string[], lowerIds: string[]): CupRound[] {
  const entrants = shuffle([...topIds, ...lowerIds]);
  const ties: CupTie[] = [];
  for (let i = 0; i < entrants.length; i += 2) {
    ties.push({ home: entrants[i], away: entrants[i + 1], played: false, hg: 0, ag: 0, winner: "", pens: null });
  }
  const names: [string, string][] = [
    ["Round of 16", "R16"],
    ["Quarter-final", "QF"],
    ["Semi-final", "SF"],
    ["Final", "F"],
  ];
  return names.map(([name, short], i) => ({
    name,
    short,
    ties:
      i === 0
        ? ties
        : Array.from({ length: 8 >> i }, () => ({ home: "", away: "", played: false, hg: 0, ag: 0, winner: "", pens: null })),
  }));
}

export function genCalendar(): Week[] {
  const cal: Week[] = [];
  let league = 1;
  const pushLeague = (n: number) => {
    for (let i = 0; i < n; i++) cal.push({ kind: "league", round: league++ });
  };
  pushLeague(5);
  cal.push({ kind: "cup", cupRound: 0 });
  pushLeague(6);
  cal.push({ kind: "cup", cupRound: 1 });
  pushLeague(6);
  cal.push({ kind: "cup", cupRound: 2 });
  pushLeague(5);
  cal.push({ kind: "cup", cupRound: 3 });
  return cal;
}

export function genMarket(): Player[] {
  const specs: { pos: Pos; base: number; count: number }[] = [
    // stars
    { pos: "GK", base: 83, count: 1 }, { pos: "CB", base: 83, count: 1 }, { pos: "FB", base: 82, count: 1 },
    { pos: "CM", base: 84, count: 1 }, { pos: "WF", base: 84, count: 1 }, { pos: "ST", base: 84, count: 2 },
    // good
    { pos: "GK", base: 76, count: 2 }, { pos: "CB", base: 76, count: 2 }, { pos: "FB", base: 76, count: 2 },
    { pos: "CM", base: 77, count: 2 }, { pos: "WM", base: 76, count: 2 }, { pos: "WF", base: 77, count: 2 }, { pos: "ST", base: 77, count: 2 },
    // solid
    { pos: "GK", base: 69, count: 2 }, { pos: "CB", base: 69, count: 2 }, { pos: "FB", base: 69, count: 2 },
    { pos: "CM", base: 70, count: 2 }, { pos: "WM", base: 69, count: 2 }, { pos: "WF", base: 70, count: 2 }, { pos: "ST", base: 70, count: 2 },
    // cheap
    { pos: "GK", base: 61, count: 1 }, { pos: "CB", base: 61, count: 2 }, { pos: "FB", base: 61, count: 2 },
    { pos: "CM", base: 62, count: 2 }, { pos: "WM", base: 61, count: 2 }, { pos: "WF", base: 62, count: 2 }, { pos: "ST", base: 62, count: 2 },
  ];
  const pool: Player[] = [];
  for (const s of specs) for (let i = 0; i < s.count; i++) pool.push(genPlayer(s.pos, s.base, 5));
  return shuffle(pool);
}

/** Four academy prospects — sometimes raw kids, sometimes already 80-ovr superstars. */
export function genYouthOffer(): Player[] {
  const positions: Pos[] = ["GK", "CB", "FB", "CM", "WM", "WF", "ST"];
  return Array.from({ length: 4 }, () => {
    const pos = pick(positions);
    const roll = Math.random();
    let base: number;
    let pot: number;
    if (roll < 0.14) {
      // generational kid — already elite
      base = ri(78, 84);
      pot = 97;
    } else if (roll < 0.4) {
      // top prospect
      base = ri(70, 76);
      pot = ri(84, 96);
    } else {
      base = ri(56, 66);
      pot = ri(72, 95);
    }
    const p = genPlayer(pos, base, 5, ri(17, 20));
    p.pot = clamp(Math.max(pot, ovr(p) + 2), 40, 97);
    return p;
  });
}

/** Greedy best assignment of a squad to formation slots. Returns players aligned to slot order. */
export function autoAssign(players: Player[], formation: FormationId): Player[] {
  const slots = FORMATIONS[formation].slots.map((s) => s.pos);
  const rarity: Record<Pos, number> = { GK: 0, ST: 1, WF: 2, CB: 3, FB: 4, WM: 5, CM: 6 };
  const order = slots.map((pos, i) => ({ pos, i })).sort((a, b) => rarity[a.pos] - rarity[b.pos]);
  const used = new Set<string>();
  const out: (Player | null)[] = slots.map(() => null);
  for (const { pos, i } of order) {
    const best = players
      .filter((p) => !used.has(p.id))
      .sort((a, b) => ovr(b) * POS_FIT[pos][b.pos] - ovr(a) * POS_FIT[pos][a.pos])[0];
    if (best) {
      out[i] = best;
      used.add(best.id);
    }
  }
  const fallback = players.filter((p) => !used.has(p.id));
  for (let i = 0; i < out.length; i++) {
    if (!out[i]) out[i] = fallback.shift() ?? players[i] ?? null;
  }
  return out as Player[];
}

export function formationNeeds(f: FormationId): Record<Pos, number> {
  const needs: Record<Pos, number> = { GK: 0, CB: 0, FB: 0, CM: 0, WM: 0, WF: 0, ST: 0 };
  for (const s of FORMATIONS[f].slots) needs[s.pos]++;
  return needs;
}

export { BUDGET } from "./data";
