/* Runtime smoke test: builds the new world and simulates an entire season headlessly. */
import { outcomeOf, simFull, type MatchOutcome } from "../src/lib/engine";
import { autoAssign, genCalendar, genClubShells, genCoachPool, genCup, genFixtures, genMarket, genYouthOffer, populateNpcClubs } from "../src/lib/gen";
import { applyTrade, developPlayer, genTradeOffer, leaderboards, processWeek, resolveUserLineup, startNextSeason } from "../src/lib/season";
import type { Club, GameState } from "../src/lib/types";

// --- world build (mirrors the reducer flow) ---
const { shells, lowerShells } = genClubShells();
const coachPool = genCoachPool(22);
const market = genMarket();
const user = shells[0];
user.isUser = true;
user.coach = coachPool.shift()!;
user.style = user.coach.style;
user.formation = user.coach.formation;
user.players = market.slice(0, 11);
for (const p of user.players) p.rookieSeason = 1;
const poolLeft = populateNpcClubs(shells, lowerShells, coachPool);

const ids = shells.map((c) => c.id);
const rounds = genFixtures(ids);
const cup = genCup(ids, lowerShells.map((c) => c.id));
const calendar = genCalendar();

console.log("clubs:", shells.length, "lower:", lowerShells.length, "rounds:", rounds.length, "weeks:", calendar.length, "free coaches:", poolLeft.length);
if (rounds.length !== 22 || calendar.length !== 26 || cup.length !== 4) throw new Error("calendar shape wrong");
const allNames = [...shells, ...lowerShells].map((c) => c.name.toLowerCase().replace(/[^a-z]/g, ""));
if (new Set(allNames).size !== allNames.length) throw new Error("duplicate club names!");
const allShorts = [...shells, ...lowerShells].map((c) => c.short);
if (new Set(allShorts).size !== allShorts.length) throw new Error("duplicate club shorts!");
const allColors = [...shells, ...lowerShells].map((c) => c.colors[0]);
if (new Set(allColors).size !== allColors.length) throw new Error("duplicate club colours!");
console.log("club names unique ✓ shorts unique ✓ colours unique ✓");
for (const c of [...shells, ...lowerShells]) {
  if (c.players.length !== 11) throw new Error(`club ${c.name} has ${c.players.length} players`);
}

// --- minimal state for season helpers ---
const state = {
  v: 2, season: 1, manager: "Test", phase: "hub", tab: "home",
  userClubId: user.id, youId: user.players[0].id, budget: 0, market, signedIds: [],
  clubs: shells, lower: lowerShells, coachPool: poolLeft,
  lineup: autoAssign(user.players, user.formation).map((p) => p.id),
  rounds, cup, calendar, weekIdx: 0, scorers: {}, stats: {}, tradeHistory: [],
  history: [], cupAlive: true, summary: null, posts: [], tradesLeft: 1, youth: null,
  reports: {}, careerHistory: [], seasonTactics: { formations: {}, mentalities: {} },
} as unknown as GameState;

const sim = (h: Club, a: Club, isCup: boolean): MatchOutcome => outcomeOf(simFull(h, a, { cup: isCup }));

// --- play the whole season through the real processWeek pipeline ---
while (state.weekIdx < state.calendar.length) {
  processWeek(state, sim, null);
}
if (state.phase !== "awards") throw new Error("season did not end in awards");

let goals = 0;
let matches = 0;
for (const r of state.rounds) for (const f of r) { goals += f.hg + f.ag; matches++; }
for (const cr of state.cup) for (const t of cr.ties) { if (t.played) { goals += t.hg + t.ag; matches++; } }
console.log("matches:", matches, "avg goals:", (goals / matches).toFixed(2));
console.log("players with stats:", Object.keys(state.stats).length, "| posts:", state.posts.length, "| trade history:", state.tradeHistory.length);

const boards = leaderboards(state);
for (const b of boards) {
  if (b.rows.length === 0) console.log("WARN empty board:", b.title);
  else console.log(`board ${b.title}: #1 ${b.rows[0].name} ${b.rows[0].value}`);
}

const summary = state.summary!;
console.log("awards:", JSON.stringify({ mvp: summary.mvpSeason?.value, mvpL: summary.mvpLeague?.value, mvpC: summary.mvpCup?.value, boot: summary.boot?.value, mots: summary.mots?.value, motc: summary.motc?.value, young: summary.young?.value, glove: summary.glove?.value, manager: summary.manager?.name, cupRun: summary.cupRun }));
if (!summary.manager) throw new Error("manager award missing");

// user trade + lineup resolution
const npc = state.clubs.find((c) => !c.isUser)!;
state.tradesLeft = 1;
const offer = genTradeOffer(state, npc.id, user.players[2]);
if (offer.accepted && offer.give) {
  const ok = applyTrade(state, npc.id, user.players[2].id, offer.give.id);
  if (!ok) throw new Error("trade apply failed");
  if (user.players.length !== 11) throw new Error("user squad size broke after trade");
}
const resolved = resolveUserLineup(state);
if (resolved.length !== 11 || resolved.some((p) => !p)) throw new Error("lineup resolution failed");

// youth + development trajectory
const youth = genYouthOffer();
if (youth.length !== 4) throw new Error("youth offer wrong");
const h0 = user.players[0].hist.length;
developPlayer(user.players[0]);
console.log("youth sample:", youth.map((p) => `${p.pos}/${p.age}y/pot${p.pot}`).join(" "), "| hist entries:", h0);

// season rollover (summary already computed by the final processWeek)
if (!state.summary) throw new Error("summary missing");
startNextSeason(state);
if (state.season !== 2 || (state.phase as string) !== "hub" || state.rounds.length !== 22) throw new Error("rollover failed");
// lineup must always be exactly 11 unique, real players — no empty spots, ever
{
  const ids = state.lineup.filter((x): x is string => !!x);
  const squadIds = new Set(user.players.map((p) => p.id));
  if (ids.length !== 11 || new Set(ids).size !== 11 || !ids.every((id) => squadIds.has(id))) {
    throw new Error(`lineup broken after rollover: ${JSON.stringify(state.lineup)}`);
  }
  console.log("lineup integrity ✓ (11 unique players after rollover)");
}
// career archives must be captured during rollover
if (state.careerHistory.length !== 1) throw new Error("career history not archived");
const withCareer = user.players.filter((p) => (p.career ?? []).length > 0).length;
if (withCareer === 0) throw new Error("no player career lines archived");
console.log(`career archive ✓ (history: ${state.careerHistory.length}, players with career: ${withCareer})`);
if (Object.keys(state.stats).length !== 0) throw new Error("stats should reset");
for (const c of [...state.clubs, ...state.lower]) {
  if (c.players.length !== 11) throw new Error(`squad size wrong for ${c.name}: ${c.players.length}`);
}
console.log("SMOKE OK — season 2 ready");
