import { COMMENT_TEXTS, FORMATIONS, HANDLES, POS_FIT, sameLine } from "./data";
import type { MatchOutcome } from "./engine";
import type { MatchReport } from "./types";
import { autoAssign, clamp, genCalendar, genCup, genFixtures, genPlayer, ovr, pick, refreshValue, ri, uid } from "./gen";
import type { AwardEntry, Club, Fixture, GameState, MatchRecord, Player, PlayerStats, Post } from "./types";

export interface TableRow {
  clubId: string;
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

export function allClubs(state: GameState): Club[] {
  return [...state.clubs, ...state.lower];
}

export function clubById(state: GameState, id: string): Club {
  return allClubs(state).find((c) => c.id === id)!;
}

export function standings(state: GameState): TableRow[] {
  const rows = new Map<string, TableRow>();
  for (const c of state.clubs) rows.set(c.id, { clubId: c.id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 });
  for (const round of state.rounds) {
    for (const f of round) {
      if (!f.played) continue;
      const h = rows.get(f.home)!;
      const a = rows.get(f.away)!;
      h.p++; a.p++;
      h.gf += f.hg; h.ga += f.ag;
      a.gf += f.ag; a.ga += f.hg;
      if (f.hg > f.ag) { h.w++; a.l++; h.pts += 3; }
      else if (f.hg < f.ag) { a.w++; h.l++; a.pts += 3; }
      else { h.d++; a.d++; h.pts++; a.pts++; }
    }
  }
  const list = [...rows.values()];
  for (const r of list) r.gd = r.gf - r.ga;
  list.sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf);
  return list;
}

export function formStr(state: GameState, clubId: string): string {
  const out: string[] = [];
  for (const round of state.rounds) {
    for (const f of round) {
      if (!f.played) continue;
      if (f.home === clubId) out.push(f.hg > f.ag ? "W" : f.hg < f.ag ? "L" : "D");
      else if (f.away === clubId) out.push(f.ag > f.hg ? "W" : f.ag < f.hg ? "L" : "D");
    }
  }
  return out.slice(-5).join("");
}

export function losingStreak(state: GameState, clubId: string): number {
  const seq = formStr(state, clubId);
  let n = 0;
  for (let i = seq.length - 1; i >= 0; i--) {
    if (seq[i] === "L") n++;
    else break;
  }
  return n;
}

export interface NextMatchInfo {
  kind: "league" | "cup" | "rest" | "done";
  roundLabel: string;
  fixtureIdx: number;
  tieIdx: number;
  fixture?: Fixture;
  tie?: { home: string; away: string };
  userHome: boolean;
}

export function nextMatchInfo(state: GameState): NextMatchInfo {
  if (state.weekIdx >= state.calendar.length) return { kind: "done", roundLabel: "", fixtureIdx: -1, tieIdx: -1, userHome: false };
  const week = state.calendar[state.weekIdx];
  if (week.kind === "league") {
    const round = state.rounds[week.round - 1];
    const idx = round.findIndex((f) => f.home === state.userClubId || f.away === state.userClubId);
    if (idx < 0) return { kind: "rest", roundLabel: `Matchweek ${week.round}`, fixtureIdx: -1, tieIdx: -1, userHome: false };
    const f = round[idx];
    return { kind: "league", roundLabel: `Matchweek ${week.round}`, fixtureIdx: idx, tieIdx: -1, fixture: f, userHome: f.home === state.userClubId };
  }
  const round = state.cup[week.cupRound];
  const idx = round.ties.findIndex((t) => t.home === state.userClubId || t.away === state.userClubId);
  if (idx < 0) return { kind: "rest", roundLabel: round.name, fixtureIdx: -1, tieIdx: -1, userHome: false };
  const t = round.ties[idx];
  return { kind: "cup", roundLabel: `Domestic Cup · ${round.name}`, fixtureIdx: -1, tieIdx: idx, tie: { home: t.home, away: t.away }, userHome: t.home === state.userClubId };
}

/* ---------------- social feed ---------------- */

function genComments(): Post["comments"] {
  const n = ri(1, 4);
  return Array.from({ length: n }, () => ({
    id: uid(),
    handle: Math.random() < 0.7 ? pick(HANDLES) : `@user${ri(10, 999)}`,
    text: pick(COMMENT_TEXTS),
    likes: ri(0, 420),
  }));
}

export function post(state: GameState, kind: Post["kind"], text: string, handle?: string, heat = 1) {
  state.posts.unshift({
    id: uid(),
    week: state.weekIdx + 1,
    handle: handle ?? pick(HANDLES),
    text,
    likes: ri(40, 900) * heat,
    rps: ri(5, 240) * heat,
    kind,
    comments: genComments(),
  });
}

const fanHandle = (c: Club) => `@${c.short}${pick(["Faithful", "Ultras", "TilIDie", "1897"])}`;

function hypePosts(state: GameState) {
  const boot = Object.values(state.scorers).sort((a, b) => b.goals - a.goals)[0];
  if (boot && boot.goals >= 4 && Math.random() < 0.5) {
    post(state, "hype", `${boot.name} (${clubById(state, boot.clubId).name}) has ${boot.goals} goals already. Put that man in the Louvre. He is HIM. 🐐`, "@xG_Overlord", 2);
  }
  if (Math.random() < 0.55) {
    const npcs = state.clubs.filter((c) => !c.isUser);
    const a = pick(npcs);
    let b = pick(npcs);
    if (b.id === a.id) b = npcs[0];
    const p = a.players.length ? pick(a.players) : null;
    if (p)
      post(
        state,
        "rumor",
        `🚨 EXCLUSIVE: ${p.name} to ${b.name}. Medical booked. Agent in the building. His mum already picked the house. (sources: two guys outside a kebab shop)`,
        "@FabrizioRomers",
        2,
      );
  }
  if (Math.random() < 0.45) {
    const npcs = state.clubs.filter((c) => !c.isUser);
    const a = pick(npcs);
    const templates = [
      `${a.coach.name}'s tactics board is just the word “panic” written four times. A THREAD 🧵`,
      `Not a single ${a.name} player can trap a ball in the rain. Embarrassing. Absolutely cooked. 💀`,
      `${a.name} fans explaining why THIS season is “part of the process” — season 14 of the process btw`,
      `${a.coach.name} lost the dressing room the day he banned mate at training. Sources: the dressing room.`,
      `New ${a.name} tier list leaked. The whole squad is in the “unserious” division. Brutal.`,
      `BREAKING: ${a.name} fans spotted being positive. Authorities investigating.`,
    ];
    post(state, "beef", pick(templates), fanHandle(pick(npcs)));
  }
  for (const c of state.clubs) {
    if (c.isUser) continue;
    if (losingStreak(state, c.id) >= 3 && Math.random() < 0.6) {
      post(
        state,
        "coach",
        `“SACKED BY MORNING” trending after ${c.name}'s ${losingStreak(state, c.id)} straight losses. The board is “calm”. Everyone is calm. The stadium is on fire. 🔥`,
        "@TheGafferFeed",
        2,
      );
    }
  }
}

/* ---------------- stats aggregation ---------------- */

/** Playing out of position teaches it — fast if you perform, slowly (or not at all) if you flop. */
function learnFromMatch(state: GameState, clubId: string, playerId: string, slotPos: Player["pos"], rating: number) {
  const club = allClubs(state).find((c) => c.id === clubId);
  const p = club?.players.find((x) => x.id === playerId);
  if (!p) return;
  if (slotPos === p.pos || slotPos === p.pos2 || slotPos === p.pos3) return;
  const gain = rating >= 7.2 ? 16 : rating >= 6.5 ? 9 : rating >= 5.7 ? 3 : 1;
  p.learn[slotPos] = Math.min(100, (p.learn[slotPos] ?? 0) + gain);
  if ((p.learn[slotPos] ?? 0) >= 100) {
    delete p.learn[slotPos];
    if (!p.pos2) p.pos2 = slotPos;
    else if (p.pos3 !== slotPos) p.pos3 = slotPos;
    if (clubId === state.userClubId) {
      post(state, "system", `📚 ${p.name} has now mastered ${slotPos} after repeated shifts there. A brand-new weapon for ${club?.name}.`, "@TheGafferFeed");
    }
  }
}

function mergePerf(state: GameState, out: MatchOutcome, comp: "L" | "C") {
  for (const line of out.perf) {
    let s = state.stats[line.playerId];
    if (!s) {
      s = {
        name: line.name, clubId: line.clubId, pos: line.pos, age: line.age,
        apps: 0, appsL: 0, appsC: 0, goals: 0, assists: 0, motm: 0, motmL: 0, motmC: 0,
        yel: 0, red: 0, saves: 0, tackles: 0, twon: 0, passes: 0, psucc: 0, clean: 0,
        rsum: 0, rsumL: 0, rsumC: 0,
      };
      state.stats[line.playerId] = s;
    }
    s.name = line.name;
    s.clubId = line.clubId;
    s.age = line.age;
    s.apps++;
    if (comp === "L") {
      s.appsL++;
      s.rsumL += line.line.rating;
    } else {
      s.appsC++;
      s.rsumC += line.line.rating;
    }
    s.goals += line.line.goals;
    s.assists += line.line.assists;
    s.yel += line.line.yel;
    s.red += line.line.red;
    s.saves += line.line.saves;
    s.tackles += line.line.tackles;
    s.twon += line.line.twon;
    s.passes += line.line.passes;
    s.psucc += line.line.psucc;
    s.rsum += line.line.rating;
    const conceded = line.side === 0 ? out.ag : out.hg;
    if ((line.pos === "GK" || line.pos === "CB" || line.pos === "FB") && conceded === 0) s.clean++;
    learnFromMatch(state, line.clubId, line.playerId, line.slotPos, line.line.rating);
  }
  if (out.motm) {
    const s = state.stats[out.motm.playerId];
    if (s) {
      s.motm++;
      if (comp === "L") s.motmL++;
      else s.motmC++;
    }
  }
}

/* ---------------- week processing ---------------- */

function applyMorale(club: Club, gf: number, ga: number) {
  if (gf > ga) club.morale = Math.min(90, club.morale + 6);
  else if (gf < ga) club.morale = Math.max(20, club.morale - 6);
  else club.morale = Math.min(90, Math.max(20, club.morale + 1));
}

function applyScorers(state: GameState, scorers: MatchOutcome["scorers"]) {
  for (const g of scorers) {
    if (!state.scorers[g.playerId]) state.scorers[g.playerId] = { name: g.name, clubId: g.clubId, goals: 0 };
    state.scorers[g.playerId].goals++;
  }
}

function maybeNpcTrade(state: GameState): void {
  if (Math.random() > 0.28) return;
  const npcs = state.clubs.filter((c) => !c.isUser && c.players.length === 11);
  if (npcs.length < 2) return;
  const a = pick(npcs);
  const b = pick(npcs);
  if (b.id === a.id) return;
  const pa = pick(a.players);
  const sorted = [...b.players].sort((x, y) => ovr(y) - ovr(x));
  // same trading line only (mid↔mid, fwd↔wing…), never their best player
  const pb = sorted.slice(1).filter((p) => Math.abs(p.value - pa.value) <= 4 && sameLine(p.pos, pa.pos))[0];
  if (!pb) return;
  a.players = a.players.map((p) => (p.id === pa.id ? pb : p));
  b.players = b.players.map((p) => (p.id === pb.id ? pa : p));
  state.tradeHistory.unshift({ wk: state.weekIdx + 1, aId: a.id, aName: a.name, bId: b.id, bName: b.name, pa: pa.name, paId: pa.id, pb: pb.name, pbId: pb.id });
  post(state, "trade", `🚨 OFFICIAL: ${a.name} and ${b.name} swap ${pa.name} ⇄ ${pb.name}. Paperwork done at 23:58, medical done in a car park, obviously.`, "@DeadlineDaye", 2);
}

export type UserWeekResult =
  | { kind: "league"; fixtureIdx: number; outcome: MatchOutcome }
  | { kind: "cup"; tieIdx: number; outcome: MatchOutcome }
  | null;

export function processWeek(state: GameState, sim: (home: Club, away: Club, cup: boolean) => MatchOutcome, userRes: UserWeekResult) {
  const week = state.calendar[state.weekIdx];
  const wkNo = state.weekIdx + 1;
  const records: MatchRecord[] = [];

  if (week.kind === "league") {
    const round = state.rounds[week.round - 1];
    round.forEach((f, idx) => {
      const isUser = userRes?.kind === "league" && userRes.fixtureIdx === idx;
      const out = isUser ? (userRes as { outcome: MatchOutcome }).outcome : sim(clubById(state, f.home), clubById(state, f.away), false);
      f.played = true;
      f.hg = out.hg;
      f.ag = out.ag;
      applyMorale(clubById(state, f.home), out.hg, out.ag);
      applyMorale(clubById(state, f.away), out.ag, out.hg);
      applyScorers(state, out.scorers);
      mergePerf(state, out, "L");
      records.push({ wk: wkNo, comp: "L", home: f.home, away: f.away, hg: out.hg, ag: out.ag });
      const hc = clubById(state, f.home);
      const ac = clubById(state, f.away);
      if (!hc.isUser && !ac.isUser && Math.random() < 0.18) {
        const winner = out.hg > out.ag ? hc : ac;
        const loser = out.hg > out.ag ? ac : hc;
        if (winner.tier + 2 <= loser.tier) post(state, "match", `${winner.name} ${Math.max(out.hg, out.ag)}-${Math.min(out.hg, out.ag)} ${loser.name}. Giant-killing energy all over this one.`, fanHandle(winner));
      }
    });
    if (userRes?.kind === "league") {
      const f = round[userRes.fixtureIdx];
      const user = clubById(state, state.userClubId);
      const userGoals = f.home === state.userClubId ? f.hg : f.ag;
      const oppGoals = f.home === state.userClubId ? f.ag : f.hg;
      const you = user.players.find((p) => p.id === state.youId);
      const youScored = userRes.outcome.scorers.some((g) => g.playerId === state.youId);
      const motmYou = userRes.outcome.motm?.playerId === state.youId;
      if (userGoals > oppGoals) {
        post(
          state,
          "match",
          youScored && you
            ? `${you.name} just dropped a MASTERCLASS vs ${clubById(state, f.home === user.id ? f.away : f.home).name}${motmYou ? " — MOTM, obviously" : ""}. GOAT behavior. No notes. 🐐 ${f.hg}-${f.ag}`
            : `${user.name} put ${f.hg > f.ag ? f.hg : f.ag} past ${clubById(state, f.home === user.id ? f.away : f.home).name} and it wasn't even close. COB? Never heard of her.`,
          fanHandle(user),
          2,
        );
      } else if (userGoals < oppGoals) {
        post(
          state,
          "match",
          you && !youScored
            ? `${user.name} lost ${f.hg}-${f.ag} and ${you.name} was a spectator in his own match. Bro got subbed off in spirit. 💀`
            : `${user.name} lost AGAIN. ${user.coach.name} doing the “we go again” press conference rn. We've seen this movie.`,
          "@BottleJobBulletin",
          2,
        );
      } else {
        post(state, "match", `${user.name} drew ${f.hg}-${f.ag}. A draw that felt like a loss that felt like nothing. “We go again” — sir, you must.`, "@TheFootballCope");
      }
    }
  } else {
    const round = state.cup[week.cupRound];
    round.ties.forEach((t, idx) => {
      const isUser = userRes?.kind === "cup" && userRes.tieIdx === idx;
      const out = isUser ? (userRes as { outcome: MatchOutcome }).outcome : sim(clubById(state, t.home), clubById(state, t.away), true);
      t.played = true;
      t.hg = out.hg;
      t.ag = out.ag;
      t.pens = out.pens;
      const winnerId = out.winner === 0 ? t.home : t.away;
      t.winner = winnerId;
      applyScorers(state, out.scorers);
      mergePerf(state, out, "C");
      records.push({ wk: wkNo, comp: "C", home: t.home, away: t.away, hg: out.hg, ag: out.ag, pens: out.pens });
      const next = state.cup[week.cupRound + 1];
      if (next) {
        const tieIdx = Math.floor(idx / 2);
        if (idx % 2 === 0) next.ties[tieIdx].home = winnerId;
        else next.ties[tieIdx].away = winnerId;
      }
      if (isUser) {
        const stillIn = winnerId === state.userClubId;
        const user = clubById(state, state.userClubId);
        if (!stillIn) {
          state.cupAlive = false;
          post(state, "system", `CUP EXIT: ${user.name} knocked out in the ${round.name}${out.pens ? " on penalties. Cruel." : "."} The dream is over — the league is all that's left.`, "@DeadlineDaye", 2);
        } else {
          post(state, "system", `${user.name} through to the next cup round${out.pens ? " after a penalty shootout. Nerves of steel." : "!"}`, fanHandle(user), 2);
        }
      }
    });
    if (week.cupRound === 3) {
      const winner = clubById(state, round.ties[0].winner);
      post(state, "system", `🏆 ${winner.name.toUpperCase()} WIN THE DOMESTIC CUP! Scenes. Absolute scenes.`, "@DeadlineDaye", 3);
    }
  }

  state.history.push(...records);
  maybeNpcTrade(state);
  hypePosts(state);
  state.posts = state.posts.slice(0, 80);
  state.tradeHistory = state.tradeHistory.slice(0, 60);

  for (const club of state.clubs) {
    if (club.isUser) continue;
    if (losingStreak(state, club.id) >= 3 && Math.random() < 0.35 && state.coachPool.length) {
      const old = club.coach;
      const idx = Math.floor(Math.random() * state.coachPool.length);
      club.coach = state.coachPool.splice(idx, 1)[0];
      club.style = club.coach.style;
      club.formation = club.coach.formation;
      state.coachPool.push(old);
      post(state, "coach", `SACKED: ${club.name} part ways with ${old.name}. ${club.coach.name} arrives and immediately changes everything to ${club.coach.style}.`, "@TheGafferFeed", 2);
    }
  }

  state.weekIdx++;
  state.tradesLeft = 1;

  if (state.weekIdx >= state.calendar.length) {
    const table = standings(state);
    const champ = clubById(state, table[0].clubId);
    const finalTie = state.cup[3].ties[0];
    const cupWinner = clubById(state, finalTie.winner);
    const userPos = table.findIndex((r) => r.clubId === state.userClubId) + 1;
    state.summary = {
      season: state.season,
      champId: champ.id,
      champName: champ.name,
      cupWinnerId: cupWinner.id,
      cupWinnerName: cupWinner.name,
      userPos,
      cupRun: cupRunLabel(state),
      manager: managerAward(state),
      boot: topBy(state, (s) => s.goals, 8),
      assists: topBy(state, (s) => s.assists, 6),
      mots: topBy(state, (s) => s.motmL, 2),
      motc: topBy(state, (s) => s.motmC, 1),
      mvpSeason: topBy(state, (s) => (s.apps >= 15 ? Math.round((s.rsum / s.apps) * 10) / 10 : 0), 15),
      mvpLeague: topBy(state, (s) => (s.appsL >= 10 ? Math.round((s.rsumL / s.appsL) * 10) / 10 : 0), 10),
      mvpCup: topBy(state, (s) => (s.appsC >= 2 ? Math.round((s.rsumC / s.appsC) * 10) / 10 : 0), 2),
      young: bestYoung(state),
      glove: topBy(state, (s) => (s.pos === "GK" ? s.clean * 2 + s.saves : 0), 5),
    };
    state.phase = "awards";
  }
}

/** How far a club went in the domestic cup. */
export function cupRunLabel(state: GameState, clubId?: string): string {
  const id = clubId ?? state.userClubId;
  let last: { roundIdx: number; won: boolean } | null = null;
  state.cup.forEach((round, r) => {
    const t = round.ties.find((x) => x.home === id || x.away === id);
    if (t && t.played) last = { roundIdx: r, won: t.winner === id };
  });
  if (!last) return "Did not enter";
  const l = last as { roundIdx: number; won: boolean };
  const name = state.cup[l.roundIdx].name;
  if (!l.won) return l.roundIdx === 3 ? "Cup runners-up" : `Out in the ${name}`;
  if (l.roundIdx === 3) return "CUP CHAMPIONS";
  return `Reached the ${state.cup[l.roundIdx + 1].name}`;
}

/** Points for how deep a club went in the cup (manager award scoring). */
function cupDepthScore(state: GameState, clubId: string): number {
  let depth = 0;
  state.cup.forEach((round, r) => {
    const t = round.ties.find((x) => x.home === clubId || x.away === clubId);
    if (t && t.played) depth = t.winner === clubId ? r + 1 : r;
  });
  return [0, 2, 4, 7, 12][depth] ?? 0;
}

/** Best manager of the season: league points + cup run. Anyone can win — including you. */
export function managerAward(state: GameState): { name: string; clubId: string; isUser: boolean } | null {
  let best: { name: string; clubId: string; isUser: boolean } | null = null;
  let bestScore = -1;
  for (const row of standings(state)) {
    const score = row.pts + cupDepthScore(state, row.clubId);
    if (score > bestScore) {
      bestScore = score;
      const club = clubById(state, row.clubId);
      best = { name: club.isUser ? state.manager : club.coach.name, clubId: club.id, isUser: !!club.isUser };
    }
  }
  return best;
}

/** Which cup stage the user is currently standing in (even while still alive). */
export function currentCupStage(state: GameState): string | null {
  const next = state.cup.find((r) => r.ties.some((t) => (t.home === state.userClubId || t.away === state.userClubId) && !t.played));
  return next ? next.name : null;
}

/** Build a storable report from a finished user match. */
export function buildReport(state: GameState, out: MatchOutcome, wk: number, comp: "L" | "C", homeId: string, awayId: string): MatchReport {
  const h = clubById(state, homeId);
  const a = clubById(state, awayId);
  return {
    wk,
    comp,
    home: { id: h.id, name: h.name, short: h.short, colors: h.colors, crest: h.crest },
    away: { id: a.id, name: a.name, short: a.short, colors: a.colors, crest: a.crest },
    hg: out.hg,
    ag: out.ag,
    pens: out.pens,
    stats: out.teamStats,
    lines: out.perf.map((p) => ({
      side: p.side,
      playerId: p.playerId,
      name: p.name,
      pos: p.pos,
      rating: p.line.rating,
      goals: p.line.goals,
      assists: p.line.assists,
      saves: p.line.saves,
      tackles: p.line.tackles,
      twon: p.line.twon,
      yel: p.line.yel,
      red: p.line.red,
      passes: Math.round(p.line.passes),
      psucc: Math.round(p.line.psucc),
    })),
    goals: out.scorers,
    motm: out.motm,
  };
}

function topBy(state: GameState, val: (s: PlayerStats) => number, minApps: number): AwardEntry | null {
  let best: AwardEntry | null = null;
  for (const [id, s] of Object.entries(state.stats)) {
    if (s.apps < minApps) continue;
    const v = val(s);
    if (v <= 0) continue;
    if (!best || v > best.value) best = { name: s.name, clubId: s.clubId, playerId: id, value: v };
  }
  return best;
}

/** Best Young: season 1 → only U20s; later → players in their first season in the league. */
export function bestYoung(state: GameState): AwardEntry | null {
  let best: AwardEntry | null = null;
  const all = allClubs(state);
  for (const [id, s] of Object.entries(state.stats)) {
    if (s.apps < 8) continue;
    const player = all.flatMap((c) => c.players).find((p) => p.name === s.name) ?? null;
    const eligible =
      state.season === 1
        ? s.age <= 19
        : player
          ? player.rookieSeason === state.season
          : false;
    if (!eligible) continue;
    const avg = Math.round((s.rsum / s.apps) * 10) / 10;
    if (!best || avg > best.value) best = { name: s.name, clubId: s.clubId, playerId: id, value: avg };
  }
  return best;
}

/* ---------------- leaderboards for the Stats tab ---------------- */

export interface Leaderboard {
  key: string;
  title: string;
  unit: string;
  rows: { name: string; playerId: string; clubId: string; value: number; sub?: string }[];
}

export function leaderboards(state: GameState): Leaderboard[] {
  const all = Object.entries(state.stats);
  const mk = (key: string, title: string, unit: string, val: (s: PlayerStats) => number, minApps: number, sub?: (s: PlayerStats) => string): Leaderboard => ({
    key,
    title,
    unit,
    rows: all
      .filter(([, s]) => s.apps >= minApps && val(s) > 0)
      .sort((a, b) => val(b[1]) - val(a[1]))
      .slice(0, 5)
      .map(([id, s]) => ({ name: s.name, playerId: id, clubId: s.clubId, value: Math.round(val(s) * 10) / 10, sub: sub?.(s) })),
  });
  return [
    mk("goals", "Golden Boot", "goals", (s) => s.goals, 1),
    mk("assists", "Playmaker", "assists", (s) => s.assists, 1),
    mk("rating", "Top Performance", "avg rating", (s) => s.rsum / s.apps, 8, (s) => `${s.apps} apps`),
    mk("motm", "Man of the Match", "MOTM", (s) => s.motm, 1),
    mk("saves", "Golden Glove Saves", "saves", (s) => (s.pos === "GK" ? s.saves : 0), 1),
    mk("clean", "Clean Sheets", "sheets", (s) => s.clean, 1),
    mk("tackles", "Ball Winners", "tackles won", (s) => s.twon, 1),
    mk("pass", "Pass Masters", "% accuracy", (s) => (s.passes > 200 ? (s.psucc / s.passes) * 100 : 0), 5),
    mk("vol", "Metronomes", "passes", (s) => Math.round(s.passes), 1),
    mk("yel", "Booked Most", "yellows", (s) => s.yel, 1),
    mk("red", "Sent Off", "reds", (s) => s.red, 1),
  ];
}

/* ---------------- trades ---------------- */

export interface TradeOffer {
  accepted: boolean;
  give?: Player;
  text: string;
}

export function genTradeOffer(state: GameState, targetId: string, offered: Player): TradeOffer {
  const target = clubById(state, targetId);
  const sorted = [...target.players].sort((a, b) => ovr(b) - ovr(a));
  const untouchable = sorted[0]?.id;
  // same trading line only (e.g. a WM can go for a CM, an ST for a WF)
  const candidates = target.players
    .filter((p) => sameLine(p.pos, offered.pos) && p.id !== untouchable && p.value <= offered.value + 4 && p.value >= Math.max(1, offered.value - 7))
    .sort((a, b) => Math.abs(a.value - offered.value) - Math.abs(b.value - offered.value));
  const give = candidates[0];
  if (!give) {
    return { accepted: false, text: `${target.name} shrug. “Nobody in that line to spare for ${offered.name}. Wrong door.”` };
  }
  if (ovr(offered) < ovr(give) - 2 && Math.random() < 0.5) {
    return { accepted: false, text: `${target.name} want ${give.name} kept. Negotiation dead — for now.` };
  }
  return { accepted: true, give, text: `${target.name} will hand over ${give.name} (${give.pos}, ${ovr(give)} ovr) for ${offered.name}. Deal?` };
}

export function applyTrade(state: GameState, targetId: string, giveId: string, getId: string): boolean {
  const user = state.clubs.find((c) => c.id === state.userClubId)!;
  const target = clubById(state, targetId);
  const mine = user.players.find((p) => p.id === giveId);
  const theirs = target.players.find((p) => p.id === getId);
  if (!mine || !theirs || state.tradesLeft <= 0) return false;
  user.players = user.players.map((p) => (p.id === mine.id ? theirs : p));
  target.players = target.players.map((p) => (p.id === theirs.id ? mine : p));
  if (state.youId === giveId) state.youId = theirs.id;
  state.lineup = state.lineup.map((id) => (id === giveId ? theirs.id : id));
  state.tradesLeft--;
  state.tradeHistory.unshift({ wk: state.weekIdx + 1, aId: user.id, aName: user.name, bId: target.id, bName: target.name, pa: mine.name, paId: mine.id, pb: theirs.name, pbId: theirs.id });
  post(state, "trade", `OFFICIAL ✍️ ${mine.name} joins ${target.name} while ${theirs.name} goes the other way to ${user.name}. Bold move.`, "@MercatoPrime", 2);
  return true;
}

/* ---------------- development, retirement, youth ---------------- */

/**
 * Seasonly development. `avgRating` is the player's average match rating this season.
 * Potential is only a scout estimate: stellar form pushes it up, chronic poor form drags it down.
 */
export function developPlayer(p: Player, avgRating?: number): number {
  const o = ovr(p);
  if (avgRating !== undefined) {
    if (avgRating >= 7.4) p.pot = clamp(Math.max(p.pot, o + ri(3, 9)), 40, 99);
    else if (avgRating < 6.0 && p.age >= 24) p.pot = Math.max(o + 2, p.pot - ri(2, 6));
  }
  let delta = 0;
  // random spike size scales with (estimated) potential — anything from 0 to 13
  const spike = p.pot >= 90 ? ri(0, 13) : p.pot >= 80 ? ri(0, 10) : p.pot >= 70 ? ri(0, 7) : ri(0, 4);
  switch (p.growth) {
    case "early":
      if (p.age <= 23) delta = spike;
      else if (p.age <= 27) delta = ri(-1, 1);
      else delta = -ri(1, 3);
      break;
    case "mid":
      if (p.age <= 26) delta = spike;
      else if (p.age <= 30) delta = ri(-1, 1);
      else delta = -ri(1, 3);
      break;
    case "late":
      if (p.age <= 30) delta = spike;
      else if (p.age <= 33) delta = ri(-1, 1);
      else delta = -ri(2, 3);
      break;
    case "wonder":
      if (!p.wonderDone && p.age >= 23 && p.age <= 26 && p.pot - o > 5) {
        delta = ri(8, 14);
        p.wonderDone = true;
      } else if (p.wonderDone) delta = -ri(4, 6);
      else delta = ri(0, 2);
      break;
    case "eternal":
      if (p.age <= 30) delta = ri(1, 3);
      else delta = 0;
      break;
    case "unique": {
      const roll = Math.random();
      if (roll < 0.15) delta = ri(5, 13);
      else if (roll < 0.3) delta = -ri(1, 3);
      else delta = ri(0, 5);
      break;
    }
  }
  // match performances fuel or stunt growth
  if (avgRating !== undefined && delta > 0) {
    if (avgRating >= 7.3) delta += ri(1, 4);
    else if (avgRating >= 6.8) delta += ri(0, 2);
    else if (avgRating < 6.2) delta = Math.floor(delta * 0.5) - ri(0, 2);
  }
  let room = Math.max(0, p.pot - o);
  if (avgRating !== undefined && avgRating >= 7.4) room += ri(2, 6); // can exceed their estimate
  if (delta > 0) delta = Math.min(room, delta);
  if (delta === 0) return 0;
  const apply = (v: number) => clamp(v + delta + ri(-1, 1), 30, 96);
  if (p.pos === "GK" && p.gk) {
    p.gk.dive = apply(p.gk.dive);
    p.gk.reflex = apply(p.gk.reflex);
    p.gk.phys = apply(p.gk.phys);
    p.gk.pass = apply(p.gk.pass);
  } else {
    p.ab.a = apply(p.ab.a);
    p.ab.d = apply(p.ab.d);
    p.ab.p = apply(p.ab.p);
    p.ab.dr = apply(p.ab.dr);
    p.ab.pa = apply(p.ab.pa);
    p.ab.v = apply(p.ab.v);
    p.ab.s = apply(p.ab.s);
    p.ab.ph = apply(p.ab.ph);
  }
  refreshValue(p);
  return delta;
}

export function retireChance(p: Player): number {
  if (p.growth === "eternal") return p.age >= 40 ? 1 : p.age >= 37 ? 0.5 : 0;
  if (p.age >= 40) return 1;
  if (p.age >= 37) return 0.75;
  if (p.age >= 35) return 0.45;
  if (p.age >= 33) return 0.2;
  if (p.age >= 31) return 0.06;
  return 0.005;
}

export function runDevelopment(state: GameState): string[] {
  const notes: string[] = [];
  const nextSeason = state.season + 1;
  for (const club of allClubs(state)) {
    const kept: Player[] = [];
    for (const p of club.players) {
      p.age++;
      const s = state.stats[p.id];
      developPlayer(p, s && s.apps >= 5 ? s.rsum / s.apps : undefined);
      p.hist.push(ovr(p));
      if (p.hist.length > 14) p.hist.shift();
      if (Math.random() < retireChance(p)) {
        notes.push(`${p.name} (${club.short}) retires at ${p.age}.`);
        if (club.isUser) continue;
        const kid = genPlayer(p.pos, [56, 60, 64, 68, 72][club.tier - 1], 6, ri(17, 20));
        kid.rookieSeason = nextSeason;
        kept.push(kid);
      } else {
        kept.push(p);
      }
    }
    club.players = kept;
  }
  return notes;
}

export function topUpSquads(state: GameState) {
  const nextSeason = state.season + 1;
  for (const club of allClubs(state)) {
    while (club.players.length < 11) {
      const missing = ["GK", "CB", "FB", "CM", "WM", "WF", "ST"].find(
        (pos) => club.players.filter((p) => p.pos === pos).length === 0,
      );
      const kid = genPlayer((missing ?? pick(["CM", "CB", "WF", "ST"])) as Player["pos"], 58, 6, ri(17, 21));
      kid.rookieSeason = nextSeason;
      club.players.push(kid);
    }
  }
}

export function startNextSeason(state: GameState) {
  // archive every player's season into their career dossier BEFORE stats reset
  for (const [id, s] of Object.entries(state.stats)) {
    const club = allClubs(state).find((c) => c.players.some((p) => p.id === id));
    const p = club?.players.find((x) => x.id === id);
    if (p) {
      p.career = [
        ...(p.career ?? []),
        {
          season: state.season,
          clubId: club!.id,
          clubShort: club!.short,
          apps: s.apps,
          goals: s.goals,
          assists: s.assists,
          avg: s.apps ? Math.round((s.rsum / s.apps) * 10) / 10 : 0,
        },
      ];
      if (p.career.length > 16) p.career.shift();
    }
  }
  // archive the manager's season
  const table = standings(state);
  const me = table.find((r) => r.clubId === state.userClubId);
  state.careerHistory.push({
    season: state.season,
    pos: me ? table.indexOf(me) + 1 : 0,
    cupRun: cupRunLabel(state),
    w: me?.w ?? 0,
    d: me?.d ?? 0,
    l: me?.l ?? 0,
    formations: { ...state.seasonTactics.formations },
    mentalities: { ...state.seasonTactics.mentalities },
  });
  state.seasonTactics = { formations: {}, mentalities: {} };
  state.reports = {};

  const notes = runDevelopment(state);
  topUpSquads(state);

  const user = state.clubs.find((c) => c.id === state.userClubId)!;
  if (!user.players.find((p) => p.id === state.youId)) {
    state.youId = [...user.players].sort((a, b) => ovr(b) - ovr(a))[0]?.id ?? "";
  }
  // retirements/trades may have left stale ids in the team sheet — heal it immediately
  normalizeLineup(state);

  state.season++;
  const ids = state.clubs.map((c) => c.id);
  state.rounds = genFixtures(ids);
  state.cup = genCup(ids, state.lower.map((c) => c.id));
  state.calendar = genCalendar();
  state.weekIdx = 0;
  state.scorers = {};
  state.stats = {};
  state.history = [];
  state.cupAlive = true;
  state.summary = null;
  state.tradesLeft = 1;
  state.youth = null;
  state.posts = [];
  post(state, "system", `Season ${state.season} is HERE. New fixtures, new drama, same delusions of grandeur.`, "@DeadlineDaye", 2);
  for (const n of notes.slice(0, 6)) post(state, "system", `🕊️ ${n} End of an era.`, "@TheGafferFeed");
  state.phase = "hub";
  state.tab = "home";
}

/** The user's lineup is always 11 valid players — any hole is auto-filled instantly. */
export function normalizeLineup(state: GameState) {
  const club = state.clubs.find((c) => c.id === state.userClubId);
  if (!club) return;
  const byId = new Map(club.players.map((p) => [p.id, p]));
  const ids: (string | null)[] = state.lineup.slice(0, 11);
  while (ids.length < 11) ids.push(null);
  const used = new Set<string>();
  const valid = ids.map((id) => {
    if (id && byId.has(id) && !used.has(id)) {
      used.add(id);
      return id;
    }
    return null;
  });
  if (valid.some((x) => x === null)) {
    const remaining = club.players.filter((p) => !used.has(p.id));
    const slots = FORMATIONS[club.formation].slots;
    for (let i = 0; i < 11; i++) {
      if (valid[i] !== null) continue;
      const slotPos = slots[i]?.pos ?? "CM";
      const best = [...remaining].sort(
        (a, b) => ovr(b) * POS_FIT[slotPos][b.pos] - ovr(a) * POS_FIT[slotPos][a.pos],
      )[0];
      if (best) {
        valid[i] = best.id;
        used.add(best.id);
        remaining.splice(remaining.indexOf(best), 1);
      }
    }
  }
  state.lineup = valid;
}

/** Resolve the user's stored lineup ids against the current squad; auto-fills gaps. */
export function resolveUserLineup(state: GameState): Player[] {
  normalizeLineup(state);
  const user = state.clubs.find((c) => c.id === state.userClubId)!;
  const byId = new Map(user.players.map((p) => [p.id, p]));
  return state.lineup.map((id) => (id ? byId.get(id) : undefined)).filter((p): p is Player => !!p);
}
