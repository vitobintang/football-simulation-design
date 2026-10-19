import { BLOCK_TEXTS, FORMATIONS, GOAL_TEXTS, POS_FIT, SAVE_TEXTS, STYLES, TACKLE_TEXTS, WIDE_TEXTS, styleMatchup, type SlotDef, type StyleDef } from "./data";
import { autoAssign, clamp, ovr, pick, ri } from "./gen";
import type { Club, EngineEvent, FormationId, GoalEntry, Mentality, PerfLine, Player } from "./types";

/** How well a player fits a slot — their own position or any learned secondary counts as natural. */
export function slotFit(p: Player, slotPos: Player["pos"]): number {
  if (p.pos === slotPos || p.pos2 === slotPos || p.pos3 === slotPos) return 1;
  return POS_FIT[slotPos]?.[p.pos] ?? 0.6;
}

/** Weighted style fit: how well the players in the key slots match the playstyle's demands. */
export function styleFitOf(lineup: (Player | null | undefined)[], slots: SlotDef[], st: StyleDef): number {
  let sum = 0;
  let w = 0;
  slots.forEach((slot, i) => {
    if (!st.keySlots.includes(slot.pos)) return;
    const p = lineup[i];
    if (!p || p.pos === "GK") return;
    const weight = st.weights[slot.pos] ?? 1;
    sum += st.keyStat(p) * weight;
    w += weight;
  });
  const avg = w ? sum / w : 55;
  return clamp(0.88 + (avg - 60) * 0.004, 0.8, 1.14);
}

export interface SideState {
  clubId: string;
  name: string;
  short: string;
  colors: [string, string];
  crest: number;
  style: Club["style"];
  formation: FormationId;
  lineup: Player[];
  energy: Record<string, number>;
  injured: Set<string>;
  /** sent off during this match — plays no further part, available next week */
  off: Set<string>;
  /** outfield player forced into goal after a GK red card — their old slot is sacrificed */
  makeshiftGK: string | null;
  /** waiting for the user to pick who wears the gloves */
  pendingGKPick: boolean;
  /** the formation slot each starter occupies */
  slotPos: Record<string, Player["pos"]>;
  mentality: Mentality;
  morale: number;
  isUser: boolean;
  youId: string;
  baseAtt: number;
  baseDef: number;
  gk: number;
  shoot: number;
  control: number;
  styleFit: number;
  perf: Record<string, PerfLine>;
}

export interface PenState {
  kicks: { side: 0 | 1; goal: boolean; name: string }[];
  score: [number, number];
  done: boolean;
}

export interface MatchState {
  min: number;
  half: 1 | 2;
  /** "pick" = waiting for the user to choose a makeshift goalkeeper after a GK red card */
  phase: "live" | "ht" | "pen" | "ft" | "pick";
  extra1: number;
  extra2: number;
  home: SideState;
  away: SideState;
  score: [number, number];
  stats: [SideStats, SideStats];
  events: EngineEvent[];
  goals: GoalEntry[];
  cup: boolean;
  pens: PenState | null;
  motm: { playerId: string; name: string; clubId: string; rating: number } | null;
  finalized: boolean;
}

export interface SideStats {
  pos: number;
  sh: number;
  sot: number;
  sv: number;
  ck: number;
}

const newStats = (): SideStats => ({ pos: 0, sh: 0, sot: 0, sv: 0, ck: 0 });

const newPerf = (): PerfLine => ({ goals: 0, assists: 0, saves: 0, tackles: 0, twon: 0, passes: 0, psucc: 0, yel: 0, red: 0, rating: 0 });

/** Anyone pulled into goal is equally out of their depth. */
export const MAKESHIFT_GK = 55;

const gkOf = (side: SideState): Player | null => {
  const gkP = side.lineup.find((p) => p.pos === "GK");
  if (gkP && !side.off.has(gkP.id)) return gkP;
  if (side.makeshiftGK) return side.lineup.find((p) => p.id === side.makeshiftGK) ?? null;
  return null;
};

/** Outfield players actually on the pitch (not ejected, not standing in goal). */
const activeOutfield = (side: SideState): Player[] =>
  side.lineup.filter((p) => p.pos !== "GK" && !side.off.has(p.id) && p.id !== side.makeshiftGK);

const boost = (p: Player, youId: string) => (p.id === youId ? 4 : 0);

function computeRatings(side: SideState) {
  const slots = FORMATIONS[side.formation].slots;
  const st = STYLES[side.style];
  let att = 0;
  let def = 0;
  let shoot = 0;
  let control = 0;
  let n = 0;
  const gkP = side.lineup.find((p) => p.pos === "GK" && !side.off.has(p.id));

  side.lineup.forEach((p, i) => {
    const slot = slots[i];
    // ejected players are gone; the makeshift keeper's old slot is sacrificed
    if (!slot || side.off.has(p.id) || p.id === side.makeshiftGK) return;
    const fit = slotFit(p, slot.pos) * (side.injured.has(p.id) ? 0.85 : 1);
    const b = boost(p, side.youId);
    const { a, d, p: pass, dr, pa, v, s, ph } = p.ab;
    if (p.pos === "GK") return;
    n++;
    att += ((a + b) * 0.32 + (s + b) * 0.22 + (dr + b) * 0.14 + (pa + b) * 0.14 + (v + b) * 0.1 + pass * 0.08) * fit;
    def += ((d + b) * 0.42 + (ph + b) * 0.24 + (pa + b) * 0.16 + pass * 0.1 + a * 0.08) * fit;
    shoot += (s + b) * fit;
    control += (pass * 0.55 + (v + b) * 0.45) * fit;
  });

  const nn = Math.max(1, n);
  const manDown = n / 10; // below a full outfield XI, the whole unit suffers
  side.styleFit = styleFitOf(side.lineup, slots, st);
  side.baseAtt = (att / nn) * st.att * side.styleFit * manDown;
  side.baseDef = (def / nn) * st.def * (0.94 + side.styleFit * 0.06) * manDown;
  side.shoot = shoot / nn;
  let ctrl = control / nn;
  if (side.style === "possession") ctrl += 4 + (side.styleFit - 0.88) * 30;
  if (side.style === "lowblock") ctrl -= 8;
  if (side.style === "longball") ctrl -= 5;
  side.control = ctrl;
  // no natural keeper available (red card) → whoever stands in goal is equally shaky
  side.gk = gkP?.gk ? gkP.gk.dive * 0.38 + gkP.gk.reflex * 0.32 + gkP.gk.phys * 0.3 : MAKESHIFT_GK;
}

export function buildSide(club: Club, opts: { youId?: string; mentality?: Mentality; lineup?: Player[] } = {}): SideState {
  let lineup = opts.lineup && opts.lineup.length === FORMATIONS[club.formation].slots.length ? opts.lineup : autoAssign(club.players, club.formation);
  if (lineup.some((p) => !p)) lineup = autoAssign(club.players, club.formation);
  const energy: Record<string, number> = {};
  const perf: Record<string, PerfLine> = {};
  const slotPos: Record<string, Player["pos"]> = {};
  const slots = FORMATIONS[club.formation].slots;
  lineup.forEach((p, i) => {
    energy[p.id] = 100;
    perf[p.id] = newPerf();
    slotPos[p.id] = slots[i]?.pos ?? p.pos;
  });
  const side: SideState = {
    clubId: club.id,
    name: club.name,
    short: club.short,
    colors: club.colors,
    crest: club.crest,
    style: club.style,
    formation: club.formation,
    lineup,
    energy,
    injured: new Set<string>(),
    off: new Set<string>(),
    makeshiftGK: null,
    pendingGKPick: false,
    slotPos,
    mentality: opts.mentality ?? "bal",
    morale: club.morale,
    isUser: !!club.isUser,
    youId: opts.youId ?? "",
    baseAtt: 0,
    baseDef: 0,
    gk: 0,
    shoot: 0,
    control: 0,
    styleFit: 1,
    perf,
  };
  computeRatings(side);
  return side;
}

const avgEnergy = (side: SideState) => {
  const out = side.lineup.filter((p) => p.pos !== "GK");
  if (!out.length) return 100;
  return out.reduce((s, p) => s + (side.energy[p.id] ?? 100), 0) / out.length;
};

export function effRatings(side: SideState, isHome: boolean) {
  const e = avgEnergy(side);
  const fatigue = 0.78 + 0.22 * (e / 100);
  const moraleM = 0.965 + (side.morale / 100) * 0.07;
  const mA = side.mentality === "att" ? 1.14 : side.mentality === "def" ? 0.86 : 1;
  const mD = side.mentality === "att" ? 0.88 : side.mentality === "def" ? 1.14 : 1;
  const home = isHome ? 1.045 : 1;
  return {
    att: side.baseAtt * fatigue * moraleM * mA * home,
    def: side.baseDef * fatigue * moraleM * mD * home,
  };
}

export function createMatch(homeClub: Club, awayClub: Club, opts: { cup?: boolean; youId?: string; homeLineup?: Player[]; awayLineup?: Player[] } = {}): MatchState {
  const state: MatchState = {
    min: 0,
    half: 1,
    phase: "live",
    extra1: ri(1, 3),
    extra2: ri(2, 4),
    home: buildSide(homeClub, { youId: homeClub.isUser ? opts.youId : "", lineup: opts.homeLineup }),
    away: buildSide(awayClub, { youId: awayClub.isUser ? opts.youId : "", lineup: opts.awayLineup }),
    score: [0, 0],
    stats: [newStats(), newStats()],
    events: [],
    goals: [],
    cup: !!opts.cup,
    pens: null,
    motm: null,
    finalized: false,
  };
  state.events.push({ min: 0, type: "kick", side: -1, text: `Kick-off! ${homeClub.name} vs ${awayClub.name}.` });
  return state;
}

const scorerWeight = (p: Player) => {
  const base = p.ab.s * 1.1 + p.ab.a;
  if (p.pos === "ST") return base * 3;
  if (p.pos === "WF" || p.pos === "WM") return base * 1.4;
  if (p.pos === "CM") return base * 0.8;
  return base * 0.22;
};

const assisterWeight = (p: Player) =>
  (p.ab.v * 0.6 + p.ab.p * 0.4) * (p.pos === "CM" ? 2 : p.pos === "WF" || p.pos === "WM" ? 1.6 : p.pos === "FB" ? 1 : 0.5);

function weightedPick<T>(items: T[], weight: (t: T) => number): T | null {
  const total = items.reduce((s, i) => s + Math.max(0.01, weight(i)), 0);
  let r = Math.random() * total;
  for (const i of items) {
    r -= Math.max(0.01, weight(i));
    if (r <= 0) return i;
  }
  return items[0] ?? null;
}

const tpl = (texts: string[], scorer: string) => pick(texts).replace("{s}", scorer);

function doChance(state: MatchState, atkSide: 0 | 1) {
  const atk = atkSide === 0 ? state.home : state.away;
  const def = atkSide === 0 ? state.away : state.home;
  const st = state.stats[atkSide];
  const defSt = state.stats[atkSide === 0 ? 1 : 0];
  const { att } = effRatings(atk, atkSide === 0);
  const { def: defR } = effRatings(def, atkSide === 1);
  const matchup = styleMatchup(atk.style, def.style);

  const outfield = activeOutfield(atk);
  const scorer = weightedPick(outfield, scorerWeight);
  if (!scorer) return;

  const edge = (att - defR) / (att + defR);
  const goalP = clamp(0.125 + (atk.shoot - def.gk) * 0.0013 + edge * 0.06 + (matchup - 1) * 0.25, 0.05, 0.37);

  st.sh++;
  if (Math.random() < goalP) {
    state.score[atkSide]++;
    st.sot++;
    atk.perf[scorer.id].goals++;
    let text = tpl(GOAL_TEXTS, scorer.name);
    const assistPool = outfield.filter((p) => p.id !== scorer.id);
    if (Math.random() < 0.62) {
      const assister = weightedPick(assistPool, assisterWeight);
      if (assister) {
        atk.perf[assister.id].assists++;
        text += ` Assist: ${assister.name}.`;
      }
    }
    state.goals.push({ playerId: scorer.id, name: scorer.name, clubId: atk.clubId, side: atkSide, min: state.min });
    state.events.push({ min: state.min, type: "goal", side: atkSide, text });
    return;
  }
  const r = Math.random();
  if (r < 0.42) {
    st.sot++;
    defSt.sv++;
    const gk = gkOf(def);
    if (gk) def.perf[gk.id].saves++;
    state.events.push({ min: state.min, type: "save", side: atkSide, text: tpl(SAVE_TEXTS, scorer.name) });
  } else if (r < 0.68) {
    if (Math.random() < 0.5) st.ck++;
    state.events.push({ min: state.min, type: "block", side: atkSide, text: tpl(BLOCK_TEXTS, scorer.name) });
  } else {
    if (Math.random() < 0.25) st.ck++;
    state.events.push({ min: state.min, type: "wide", side: atkSide, text: tpl(WIDE_TEXTS, scorer.name) });
  }
}

/** Defensive actions: tackle attempts with a visible highlight when won cleanly. */
function doTackle(state: MatchState, defSide: 0 | 1) {
  const def = defSide === 0 ? state.home : state.away;
  const opp = defSide === 0 ? state.away : state.home;
  const pool = activeOutfield(def).filter((p) => p.pos === "CB" || p.pos === "FB" || p.pos === "CM" || p.pos === "WM");
  const tackler = weightedPick(pool.length ? pool : activeOutfield(def), (p) => p.ab.d * 1.2 + p.ab.ph * 0.6);
  if (!tackler) return;
  const carrier = weightedPick(activeOutfield(opp), (p) => p.ab.dr + p.ab.pa * 0.5);
  const winP = clamp(0.54 + (tackler.ab.d - (carrier?.ab.dr ?? 65)) * 0.006, 0.34, 0.82);
  const line = def.perf[tackler.id];
  line.tackles++;
  if (Math.random() < winP) {
    line.twon++;
    if (Math.random() < 0.3) {
      state.events.push({
        min: state.min,
        type: "tackle",
        side: defSide,
        text: tpl(TACKLE_TEXTS, tackler.name).replace("{o}", carrier?.name ?? "the attacker"),
      });
    }
  }
}

const ROLE_PASSES: Record<Player["pos"], number> = { GK: 1.1, CB: 2.0, FB: 2.4, CM: 3.1, WM: 2.3, WF: 2.0, ST: 1.2 };

/** Passing volume & accuracy per minute, per player. */
function doPassing(state: MatchState, sideIdx: 0 | 1) {
  const side = sideIdx === 0 ? state.home : state.away;
  const st = STYLES[side.style];
  const ctrlShare = side.control / Math.max(1, side.control + (sideIdx === 0 ? state.away : state.home).control);
  for (const p of side.lineup) {
    if (side.off.has(p.id) || p.id === side.makeshiftGK) continue;
    const attempts = ROLE_PASSES[p.pos] * st.tempo * (0.55 + ctrlShare * 0.9) * rf08();
    const skill = p.pos === "GK" && p.gk ? p.gk.pass : p.ab.p * 0.62 + p.ab.v * 0.38;
    const acc = clamp(0.68 + (skill - 60) * 0.0042 + (side.styleFit - 1) * 0.55, 0.5, 0.94);
    const line = side.perf[p.id];
    line.passes += attempts;
    line.psucc += attempts * acc;
  }
}

const rf08 = () => 0.8 + Math.random() * 0.4;

function maybeCard(state: MatchState, sideIdx: 0 | 1) {
  const side = sideIdx === 0 ? state.home : state.away;
  const gkActive = side.lineup.some((p) => p.pos === "GK" && !side.off.has(p.id));
  const pool = side.lineup.filter(
    (p) => !side.off.has(p.id) && p.id !== side.makeshiftGK && (p.pos === "CB" || p.pos === "FB" || p.pos === "CM" || (p.pos === "GK" && gkActive)),
  );
  const p = pool.length ? pick(pool) : side.lineup[0];
  if (!p || side.off.has(p.id)) return;
  const red = Math.random() < (p.pos === "GK" ? 0.03 : 0.07);
  const line = side.perf[p.id];
  if (red) {
    line.red++;
    side.off.add(p.id); // ejected for the rest of THIS match only — free to play next week
    if (p.pos === "GK") {
      state.events.push({
        min: state.min,
        type: "card",
        side: sideIdx,
        text: `RED CARD! Keeper ${p.name} (${side.short}) is sent off! Someone has to wear the gloves…`,
      });
      if (side.isUser) {
        side.pendingGKPick = true;
        state.phase = "pick"; // you decide who goes in goal
      } else {
        autoPickMakeshift(state, sideIdx);
      }
      computeRatings(side);
      return;
    }
    computeRatings(side);
    state.events.push({
      min: state.min,
      type: "card",
      side: sideIdx,
      text: `RED CARD! ${p.name} (${side.short}) is sent off — down to ten men!`,
    });
  } else {
    line.yel++;
    state.events.push({ min: state.min, type: "card", side: sideIdx, text: `Yellow card — ${p.name} (${side.short}).` });
  }
}

/** Send an outfield player to goal: identical keeping ability, their old slot is sacrificed. */
function assignMakeshift(state: MatchState, sideIdx: 0 | 1, playerId: string) {
  const side = sideIdx === 0 ? state.home : state.away;
  const candidate = side.lineup.find((p) => p.id === playerId && p.pos !== "GK" && !side.off.has(p.id));
  if (!candidate) return false;
  side.makeshiftGK = candidate.id;
  side.pendingGKPick = false;
  computeRatings(side);
  state.events.push({
    min: state.min,
    type: "card",
    side: sideIdx,
    text: `${candidate.name} pulls on the gloves! ${side.short} sacrifice their ${side.slotPos[candidate.id]} slot with ten men.`,
  });
  return true;
}

function autoPickMakeshift(state: MatchState, sideIdx: 0 | 1) {
  const side = sideIdx === 0 ? state.home : state.away;
  const victim = [...activeOutfield(side)].sort((a, b) => ovr(a) - ovr(b))[0];
  if (victim) assignMakeshift(state, sideIdx, victim.id);
}

/** UI hook: the user chooses who takes the gloves. */
export function chooseMakeshiftGK(state: MatchState, playerId: string) {
  const pendingIdx = state.home.pendingGKPick ? 0 : state.away.pendingGKPick ? 1 : -1;
  if (pendingIdx < 0) return;
  if (assignMakeshift(state, pendingIdx as 0 | 1, playerId)) state.phase = "live";
}

function maybeInjury(state: MatchState, sideIdx: 0 | 1) {
  const side = sideIdx === 0 ? state.home : state.away;
  const outfield = side.lineup.filter((p) => p.pos !== "GK" && !side.injured.has(p.id) && !side.off.has(p.id));
  if (!outfield.length) return;
  const hurt = pick(outfield);
  side.injured.add(hurt.id);
  computeRatings(side);
  state.events.push({ min: state.min, type: "inj", side: sideIdx, text: `${hurt.name} is hurt but plays on — no bench, no excuses.` });
}

function tickSide(state: MatchState, sideIdx: 0 | 1) {
  const side = sideIdx === 0 ? state.home : state.away;
  const opp = sideIdx === 0 ? state.away : state.home;
  const st = STYLES[side.style];
  const { att } = effRatings(side, sideIdx === 0);
  const { def } = effRatings(opp, sideIdx === 1);
  const edge = (att - def) / (att + def);
  const late = state.min > 80 ? 1.1 : 1;
  const pChance = clamp(0.112 + edge * 0.13, 0.03, 0.25) * st.tempo * late;

  let ctrl = side.control;
  if (side.styleFit < 0.95) ctrl *= side.styleFit * 0.97;
  const oppCtrl = opp.styleFit < 0.95 ? opp.control * opp.styleFit * 0.97 : opp.control;
  const ctrlSum = ctrl + oppCtrl;
  if (Math.random() < ctrl / Math.max(1, ctrlSum)) state.stats[sideIdx].pos++;
  else state.stats[sideIdx === 0 ? 1 : 0].pos++;

  if (Math.random() < pChance) doChance(state, sideIdx);
  if (Math.random() < 0.09) doTackle(state, sideIdx);
  doPassing(state, sideIdx);
  if (Math.random() < 0.021) maybeCard(state, sideIdx);
  if (Math.random() < 0.0006) maybeInjury(state, sideIdx);

  const mentFat = side.mentality === "att" ? 1.1 : side.mentality === "def" ? 0.92 : 1;
  for (const p of side.lineup) {
    if (p.pos === "GK" || side.off.has(p.id)) continue;
    side.energy[p.id] = clamp((side.energy[p.id] ?? 100) - 0.3 * st.fatigue * mentFat, 5, 100);
  }
}

function aiMentality(state: MatchState) {
  const [h, a] = state.score;
  const set = (side: SideState, mine: number, theirs: number) => {
    if (side.isUser) return;
    if (state.min >= 65 && mine < theirs) side.mentality = "att";
    else if (state.min >= 80 && mine > theirs) side.mentality = "def";
    else side.mentality = "bal";
  };
  set(state.home, h, a);
  set(state.away, a, h);
}

/** Compute final ratings + MOTM once, when the match ends. */
function finalize(state: MatchState) {
  if (state.finalized) return;
  state.finalized = true;
  const sides: [SideState, SideState] = [state.home, state.away];
  sides.forEach((side, idx) => {
    const gf = state.score[idx];
    const ga = state.score[idx === 0 ? 1 : 0];
    const res = gf > ga ? 0.25 : gf < ga ? -0.25 : 0;
    for (const p of side.lineup) {
      const line = side.perf[p.id];
      const acc = line.passes > 0 ? line.psucc / line.passes : 0.75;
      const isDef = p.pos === "GK" || p.pos === "CB" || p.pos === "FB";
      let r = 6.3;
      r += line.goals * 1.15;
      r += line.assists * 0.75;
      r += Math.min(1.2, line.saves * 0.11);
      r += Math.min(0.9, line.twon * 0.09);
      r += clamp((acc - 0.78) * 4, -0.8, 0.8);
      if (isDef && ga === 0) r += 0.5;
      if (isDef) r -= Math.min(1.2, ga * 0.12);
      r -= line.yel * 0.35;
      r -= line.red * 1.4;
      if (side.off.has(p.id)) r -= 0.6;
      if (side.injured.has(p.id)) r -= 0.3;
      r += res;
      line.rating = Math.round(clamp(r, 4, 9.9) * 10) / 10;
      if (!state.motm || line.rating > state.motm.rating) {
        state.motm = { playerId: p.id, name: p.name, clubId: side.clubId, rating: line.rating };
      }
    }
  });
}

function pickPenTaker(side: SideState): Player {
  const pool = activeOutfield(side);
  return weightedPick(pool, (p) => p.ab.s + p.ab.a * 0.5) ?? side.lineup[0];
}

export function step(state: MatchState): void {
  if (state.phase === "ht" || state.phase === "ft" || state.phase === "pick") return;

  if (state.phase === "pen") {
    const pens = state.pens!;
    const kickNo = pens.kicks.length;
    const sideIdx = (kickNo % 2) as 0 | 1;
    const side = sideIdx === 0 ? state.home : state.away;
    const opp = sideIdx === 0 ? state.away : state.home;
    const taker = pickPenTaker(side);
    const gk = gkOf(opp);
    const p = clamp(0.76 + (taker.ab.s - 72) * 0.0024 - ((gk?.gk?.reflex ?? 70) - 72) * 0.0026, 0.55, 0.93);
    const goal = Math.random() < p;
    pens.kicks.push({ side: sideIdx, goal, name: taker.name });
    if (goal) pens.score[sideIdx]++;
    const each = Math.floor((kickNo + 1) / 2);
    const [x, y] = pens.score;
    const regDone = kickNo >= 9;
    const sudden = each > 5;
    const early = each <= 5 && Math.abs(x - y) > 5 - each;
    if ((regDone || sudden || early) && x !== y && kickNo % 2 === 1) {
      pens.done = true;
      state.phase = "ft";
      finalize(state);
      const winner = x > y ? state.home.name : state.away.name;
      state.events.push({ min: 90, type: "ft", side: -1, text: `Penalties: ${x}-${y}. ${winner} advance!` });
      return;
    }
    if (kickNo >= 24 && x !== y) {
      pens.done = true;
      state.phase = "ft";
      finalize(state);
      state.events.push({ min: 90, type: "ft", side: -1, text: `Penalties: ${x}-${y}. ${x > y ? state.home.name : state.away.name} advance!` });
    }
    return;
  }

  state.min++;
  const limit = state.half === 1 ? 45 + state.extra1 : 90 + state.extra2;

  if (state.min > limit) {
    if (state.half === 1) {
      state.phase = "ht";
      state.events.push({ min: 45, type: "ht", side: -1, text: `Half-time: ${state.home.short} ${state.score[0]}-${state.score[1]} ${state.away.short}.` });
    } else {
      if (state.cup && state.score[0] === state.score[1]) {
        state.phase = "pen";
        state.pens = { kicks: [], score: [0, 0], done: false };
        finalize(state);
        state.events.push({ min: 90, type: "info", side: -1, text: "Full-time. Level after 90 — straight to penalties!" });
      } else {
        state.phase = "ft";
        finalize(state);
        state.events.push({ min: 90, type: "ft", side: -1, text: `Full-time: ${state.home.short} ${state.score[0]}-${state.score[1]} ${state.away.short}.` });
      }
    }
    return;
  }

  const ph = (): MatchState["phase"] => state.phase;
  aiMentality(state);
  tickSide(state, 0);
  if (ph() === "pick") return; // GK red card — wait for the user's choice
  tickSide(state, 1);
  if (ph() === "pick") return;
}

export function continueSecondHalf(state: MatchState) {
  if (state.phase !== "ht") return;
  state.phase = "live";
  state.half = 2;
  state.events.push({ min: 46, type: "kick", side: -1, text: "Second half under way." });
}

export function setMentality(state: MatchState, sideIdx: 0 | 1, m: Mentality) {
  (sideIdx === 0 ? state.home : state.away).mentality = m;
}

export function simFull(home: Club, away: Club, opts: { cup?: boolean; youId?: string } = {}): MatchState {
  const state = createMatch(home, away, opts);
  let guard = 0;
  while (state.phase !== "ft" && guard++ < 400) {
    if (state.phase === "ht") continueSecondHalf(state);
    else if (state.phase === "pick") {
      const idx = state.home.pendingGKPick ? 0 : 1;
      autoPickMakeshift(state, idx as 0 | 1);
      state.phase = "live";
    } else step(state);
  }
  return state;
}

export interface MatchOutcome {
  hg: number;
  ag: number;
  scorers: GoalEntry[];
  pens: [number, number] | null;
  winner: 0 | 1 | null;
  perf: { side: 0 | 1; playerId: string; name: string; clubId: string; pos: Player["pos"]; slotPos: Player["pos"]; age: number; line: PerfLine }[];
  motm: { playerId: string; name: string; clubId: string; rating: number } | null;
  teamStats: [SideStats, SideStats];
  userFormation?: string;
  userMentality?: Mentality;
}

export function outcomeOf(state: MatchState): MatchOutcome {
  finalize(state);
  let winner: 0 | 1 | null = null;
  let pens: [number, number] | null = null;
  if (state.cup) {
    if (state.pens && state.pens.done) {
      pens = [state.pens.score[0], state.pens.score[1]];
      winner = pens[0] > pens[1] ? 0 : 1;
    } else {
      winner = state.score[0] > state.score[1] ? 0 : state.score[1] > state.score[0] ? 1 : 0;
    }
  } else if (state.score[0] !== state.score[1]) {
    winner = state.score[0] > state.score[1] ? 0 : 1;
  }
  const perf: MatchOutcome["perf"] = [];
  const sides: [SideState, SideState] = [state.home, state.away];
  sides.forEach((side, idx) => {
    for (const p of side.lineup) {
      perf.push({
        side: idx as 0 | 1,
        playerId: p.id,
        name: p.name,
        clubId: side.clubId,
        pos: p.pos,
        slotPos: side.slotPos[p.id] ?? p.pos,
        age: p.age,
        line: side.perf[p.id],
      });
    }
  });
  const uSide = state.home.isUser ? state.home : state.away.isUser ? state.away : null;
  return {
    hg: state.score[0],
    ag: state.score[1],
    scorers: state.goals,
    pens,
    winner,
    perf,
    motm: state.motm,
    teamStats: [{ ...state.stats[0] }, { ...state.stats[1] }],
    userFormation: uSide?.formation,
    userMentality: uSide?.mentality,
  };
}

export { ovr };
