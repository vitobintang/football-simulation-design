"use client";

import { createContext, useCallback, useContext, useEffect, useReducer, useRef, type Dispatch, type ReactNode } from "react";
import { BUDGET, sameLine } from "./data";
import { outcomeOf, simFull, type MatchOutcome } from "./engine";
import {
  autoAssign,
  genCalendar,
  genClubShells,
  genCoachPool,
  genCup,
  genFixtures,
  genMarket,
  genYouthOffer,
  populateNpcClubs,
} from "./gen";
import { applyTrade, buildReport, nextMatchInfo, normalizeLineup, processWeek, startNextSeason } from "./season";
import type { Club, GameState, HubTab } from "./types";

import { createPersistence, SAVE_KEY } from "./persistence";
export { SAVE_KEY } from "./persistence";

export type Action =
  | { type: "HYDRATE"; state: GameState }
  | { type: "ADD_COMMENT"; postId: string; text: string }
  | { type: "NEW_GAME"; manager: string }
  | { type: "CHOOSE_CLUB"; clubId: string }
  | { type: "CHOOSE_COACH"; coachId: string }
  | { type: "SIGN"; playerId: string }
  | { type: "UNSIGN"; playerId: string }
  | { type: "SET_YOU"; playerId: string }
  | { type: "CONFIRM_SQUAD" }
  | { type: "SET_TAB"; tab: HubTab }
  | { type: "START_WEEK"; simulate?: boolean }
  | { type: "FINISH_USER_MATCH"; outcome: MatchOutcome }
  | { type: "ASSIGN_SLOT"; slot: number; playerId: string }
  | { type: "AUTO_LINEUP" }
  | { type: "HIRE_COACH"; coachId: string }
  | { type: "APPLY_TRADE"; targetId: string; giveId: string; getId: string }
  | { type: "GO_YOUTH" }
  | { type: "SWAP_YOUTH"; prospectId: string; replaceId: string }
  | { type: "FINISH_SEASON" }
  | { type: "RESET" };

const simFn = (home: Club, away: Club, cup: boolean): MatchOutcome => outcomeOf(simFull(home, away, { cup }));

export function freshTitleState(): GameState {
  return {
    v: 7,
    season: 0,
    manager: "",
    phase: "title",
    tab: "home",
    userClubId: "",
    youId: "",
    budget: BUDGET,
    market: [],
    signedIds: [],
    clubs: [],
    lower: [],
    coachPool: [],
    lineup: [],
    rounds: [],
    cup: [],
    calendar: [],
    weekIdx: 0,
    scorers: {},
    stats: {},
    tradeHistory: [],
    history: [],
    cupAlive: true,
    summary: null,
    posts: [],
    tradesLeft: 1,
    youth: null,
    reports: {},
    careerHistory: [],
    seasonTactics: { formations: {}, mentalities: {} },
  };
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "HYDRATE": {
      const s = structuredClone(action.state);
      if (s.userClubId) normalizeLineup(s);
      return s;
    }
    case "RESET":
      return freshTitleState();
    case "NEW_GAME": {
      const { shells, lowerShells } = genClubShells();
      return {
        ...freshTitleState(),
        season: 1,
        manager: action.manager,
        phase: "club",
        budget: BUDGET,
        market: genMarket(),
        clubs: shells,
        lower: lowerShells,
        coachPool: genCoachPool(22),
      };
    }
    case "CHOOSE_CLUB": {
      const s = structuredClone(state);
      const club = s.clubs.find((c) => c.id === action.clubId);
      if (!club) return state;
      club.isUser = true;
      s.userClubId = club.id;
      s.phase = "coach";
      return s;
    }
    case "CHOOSE_COACH": {
      const s = structuredClone(state);
      const idx = s.coachPool.findIndex((c) => c.id === action.coachId);
      const club = s.clubs.find((c) => c.id === s.userClubId);
      if (idx < 0 || !club) return state;
      const coach = s.coachPool.splice(idx, 1)[0];
      club.coach = coach;
      club.style = coach.style;
      club.formation = coach.formation;
      s.phase = "squad";
      return s;
    }
    case "SIGN": {
      const s = structuredClone(state);
      const p = s.market.find((m) => m.id === action.playerId);
      if (!p || s.signedIds.includes(p.id) || s.signedIds.length >= 11 || s.budget < p.value) return state;
      s.signedIds.push(p.id);
      s.budget -= p.value;
      if (!s.youId) s.youId = p.id;
      return s;
    }
    case "UNSIGN": {
      const s = structuredClone(state);
      const p = s.market.find((m) => m.id === action.playerId);
      if (!p || !s.signedIds.includes(p.id)) return state;
      s.signedIds = s.signedIds.filter((id) => id !== p.id);
      s.budget += p.value;
      if (s.youId === p.id) s.youId = s.signedIds[0] ?? "";
      return s;
    }
    case "SET_YOU": {
      const s = structuredClone(state);
      const club = s.clubs.find((c) => c.id === s.userClubId);
      const inSquad = s.signedIds.includes(action.playerId) || club?.players.some((p) => p.id === action.playerId);
      if (!inSquad) return state;
      s.youId = action.playerId;
      return s;
    }
    case "CONFIRM_SQUAD": {
      if (state.signedIds.length !== 11) return state;
      const s = structuredClone(state);
      const club = s.clubs.find((c) => c.id === s.userClubId)!;
      club.players = s.market.filter((m) => s.signedIds.includes(m.id));
      club.morale = 60;
      // world generates AFTER the user drafts
      s.coachPool = populateNpcClubs(s.clubs, s.lower, s.coachPool);
      const ids = s.clubs.map((c) => c.id);
      s.rounds = genFixtures(ids);
      s.cup = genCup(ids, s.lower.map((c) => c.id));
      s.calendar = genCalendar();
      s.lineup = autoAssign(club.players, club.formation).map((p) => p.id);
      for (const p of club.players) p.rookieSeason = 1;
      s.posts = [
        {
          id: Math.random().toString(36).slice(2, 10),
          week: 0,
          handle: "@DeadlineDaye",
          text: `CONFIRMED: ${club.name} unveil a fully rebuilt XI under manager ${s.manager}. The league takes note. 👀`,
          likes: 1240,
          rps: 310,
          kind: "system",
          comments: [
            { id: Math.random().toString(36).slice(2, 10), handle: "@RouteOneRanter", text: "Bold. Stupid, but bold.", likes: 88 },
            { id: Math.random().toString(36).slice(2, 10), handle: "@TikiTakaTina", text: "The shape is… interesting. Let's see.", likes: 41 },
          ],
        },
      ];
      s.phase = "hub";
      return s;
    }
    case "SET_TAB": {
      const s = structuredClone(state);
      s.tab = action.tab;
      return s;
    }
    case "START_WEEK": {
      const info = nextMatchInfo(state);
      if (info.kind === "league" || info.kind === "cup") {
        const s = structuredClone(state);
        s.phase = "match";
        s.autoSim = !!action.simulate;
        return s;
      }
      const s = structuredClone(state);
      processWeek(s, simFn, null);
      return s;
    }
    case "FINISH_USER_MATCH": {
      const info = nextMatchInfo(state);
      const s = structuredClone(state);
      const userRes =
        info.kind === "league"
          ? { kind: "league" as const, fixtureIdx: info.fixtureIdx, outcome: action.outcome }
          : info.kind === "cup"
            ? { kind: "cup" as const, tieIdx: info.tieIdx, outcome: action.outcome }
            : null;
      // archive a full review of the user's match + track tactics used
      if (userRes) {
        const week = s.calendar[s.weekIdx];
        let homeId = "";
        let awayId = "";
        if (week.kind === "league" && userRes.kind === "league") {
          const f = s.rounds[week.round - 1][userRes.fixtureIdx];
          homeId = f.home;
          awayId = f.away;
        } else if (week.kind === "cup" && userRes.kind === "cup") {
          const t = s.cup[week.cupRound].ties[userRes.tieIdx];
          homeId = t.home;
          awayId = t.away;
        }
        if (homeId && awayId) {
          s.reports[String(s.weekIdx)] = buildReport(s, action.outcome, s.weekIdx + 1, week.kind === "cup" ? "C" : "L", homeId, awayId);
        }
        if (action.outcome.userFormation) {
          const f = action.outcome.userFormation;
          s.seasonTactics.formations[f] = (s.seasonTactics.formations[f] ?? 0) + 1;
        }
        if (action.outcome.userMentality) {
          const m = action.outcome.userMentality;
          s.seasonTactics.mentalities[m] = (s.seasonTactics.mentalities[m] ?? 0) + 1;
        }
      }
      processWeek(s, simFn, userRes);
      s.autoSim = false;
      if (s.phase !== "awards") {
        s.phase = "hub";
        s.tab = "home";
      }
      return s;
    }
    case "ASSIGN_SLOT": {
      const s = structuredClone(state);
      if (action.slot < 0 || action.slot >= 11) return state;
      const club = s.clubs.find((c) => c.id === s.userClubId);
      if (!club || !club.players.some((p) => p.id === action.playerId)) return state;
      // pull the player out of any slot they occupy, then place (swap if occupied)
      const prevAt = s.lineup[action.slot];
      const oldSlot = s.lineup.indexOf(action.playerId);
      if (oldSlot >= 0 && prevAt && prevAt !== action.playerId) s.lineup[oldSlot] = prevAt;
      else if (oldSlot >= 0) s.lineup[oldSlot] = null;
      s.lineup[action.slot] = action.playerId;
      normalizeLineup(s); // never leave an empty spot on the team sheet
      return s;
    }
    case "AUTO_LINEUP": {
      const s = structuredClone(state);
      const club = s.clubs.find((c) => c.id === s.userClubId);
      if (!club) return state;
      s.lineup = autoAssign(club.players, club.formation).map((p) => p.id);
      return s;
    }
    case "HIRE_COACH": {
      const s = structuredClone(state);
      const club = s.clubs.find((c) => c.id === s.userClubId);
      const idx = s.coachPool.findIndex((c) => c.id === action.coachId);
      if (!club || idx < 0) return state;
      const incoming = s.coachPool.splice(idx, 1)[0];
      s.coachPool.push(club.coach);
      club.coach = incoming;
      club.style = incoming.style;
      club.formation = incoming.formation;
      s.lineup = autoAssign(club.players, club.formation).map((p) => p.id);
      s.posts.unshift({
        id: Math.random().toString(36).slice(2, 10),
        week: s.weekIdx + 1,
        handle: "@TheGafferFeed",
        text: `OFFICIAL: ${club.name} appoint ${incoming.name}. New era, new ${incoming.style} identity, ${incoming.formation} on the team sheet.`,
        likes: 830,
        rps: 190,
        kind: "coach",
        comments: [
          { id: Math.random().toString(36).slice(2, 10), handle: "@MercatoPrime", text: "He was third choice. Everyone knows.", likes: 132 },
        ],
      });
      return s;
    }
    case "ADD_COMMENT": {
      const s = structuredClone(state);
      const p = s.posts.find((x) => x.id === action.postId);
      if (!p) return state;
      p.comments.push({
        id: Math.random().toString(36).slice(2, 10),
        handle: `@${s.manager.replace(/\s+/g, "_") || "You"}`,
        text: action.text,
        likes: 0,
      });
      return s;
    }
    case "APPLY_TRADE": {
      const s = structuredClone(state);
      applyTrade(s, action.targetId, action.giveId, action.getId);
      normalizeLineup(s);
      return s;
    }
    case "GO_YOUTH": {
      const s = structuredClone(state);
      s.youth = genYouthOffer();
      s.phase = "youth";
      return s;
    }
    case "SWAP_YOUTH": {
      const s = structuredClone(state);
      const club = s.clubs.find((c) => c.id === s.userClubId);
      if (!club || !s.youth) return state;
      const prospect = s.youth.find((p) => p.id === action.prospectId);
      const replaced = club.players.find((p) => p.id === action.replaceId);
      if (!prospect || !replaced || !sameLine(prospect.pos, replaced.pos)) return state;
      prospect.rookieSeason = s.season + 1;
      club.players = club.players.map((p) => (p.id === replaced.id ? prospect : p));
      s.lineup = s.lineup.map((id) => (id === replaced.id ? prospect.id : id));
      if (s.youId === replaced.id) s.youId = prospect.id;
      s.youth = s.youth.filter((p) => p.id !== prospect.id);
      s.budget = 0; // youth deals are free — no refunds ever again
      normalizeLineup(s);
      return s;
    }
    case "FINISH_SEASON": {
      const s = structuredClone(state);
      startNextSeason(s);
      return s;
    }
    default:
      return state;
  }
}

const VALID_PHASES = new Set(["title", "club", "coach", "squad", "hub", "match", "awards", "youth"]);
const VALID_TABS = new Set(["home", "league", "cup", "tactics", "trade", "stats", "feed"]);

function isValidSave(x: unknown): x is GameState {
  if (!x || typeof x !== "object") return false;
  const s = x as Partial<GameState>;
  return (
    s.v === 7 &&
    typeof s.season === "number" &&
    typeof s.phase === "string" &&
    VALID_PHASES.has(s.phase) &&
    typeof s.userClubId === "string" &&
    Array.isArray(s.clubs) &&
    Array.isArray(s.market) &&
    Array.isArray(s.rounds) &&
    Array.isArray(s.calendar) &&
    Array.isArray(s.cup)
  );
}

const Ctx = createContext<{ state: GameState; dispatch: Dispatch<Action> } | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, reduce] = useReducer(reducer, undefined, freshTitleState);
  const persistence = useRef<ReturnType<typeof createPersistence> | null>(null);
  const loadGeneration = useRef(0);
  const hydrated = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dispatch = useCallback((action: Action) => {
    if (action.type === "RESET" || action.type === "NEW_GAME") {
      loadGeneration.current++;
      hydrated.current = true;
    }
    if (action.type === "RESET") {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      void persistence.current?.reset();
    }
    reduce(action);
  }, []);

  useEffect(() => {
    persistence.current ??= createPersistence(localStorage, fetch);
    const generation = loadGeneration.current;
    let alive = true;
    (async () => {
      let loaded: GameState | null = null;
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (isValidSave(parsed)) loaded = parsed;
          else localStorage.removeItem(SAVE_KEY);
        }
      } catch {
        loaded = null;
      }
      if (!loaded && persistence.current?.hasReset()) {
        void persistence.current.reset();
      } else if (!loaded) {
        try {
          const res = await fetch("/api/save");
          if (res.ok) {
            const j = await res.json();
            if (j?.data && isValidSave(j.data)) loaded = j.data;
          }
        } catch {
          /* offline */
        }
      }
      if (alive && generation === loadGeneration.current && loaded) {
        if (loaded.tab && !VALID_TABS.has(loaded.tab)) loaded.tab = "home";
        if (loaded.phase === "match") loaded.phase = "hub";
        dispatch({ type: "HYDRATE", state: loaded });
      }
      if (alive) hydrated.current = true;
    })();
    return () => {
      alive = false;
    };
  }, [dispatch]);

  useEffect(() => {
    if (!hydrated.current || state.season === 0) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch {
      /* full */
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void persistence.current?.save(state);
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state]);

  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useGame() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGame outside provider");
  return ctx;
}
