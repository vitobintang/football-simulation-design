"use client";

import { useMemo, useRef, useState } from "react";
import { Btn, Crest, Ovr, Panel, PlayerCard, PosTag, SectionLabel } from "@/components/ui";
import { FORMATIONS, GROWTH_LABEL, STYLES } from "@/lib/data";
import { slotFit, styleFitOf } from "@/lib/engine";
import { ovr } from "@/lib/gen";
import { ClubLink, PlayerLink, useOverlay } from "@/lib/overlay";
import { clubById, cupRunLabel, currentCupStage, formStr, genTradeOffer, leaderboards, nextMatchInfo, standings, type TradeOffer } from "@/lib/season";

const stageShort = (name: string) =>
  name.replace("Round of 16", "R16").replace("Quarter-final", "QF").replace("Semi-final", "SF").replace("Final", "Final");
import { useGame } from "@/lib/state";
import type { GameState, HubTab, Player } from "@/lib/types";

/** "Luca Moretti" → "L. Moretti" so same-surname players stay distinct on the pitch. */
const shortName = (n: string) => {
  const parts = n.split(" ");
  return parts.length > 1 ? `${parts[0][0]}. ${parts.slice(1).join(" ")}` : n;
};

const TABS: { id: HubTab; label: string; icon: string }[] = [
  { id: "home", label: "Home", icon: "M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" },
  { id: "league", label: "Lge", icon: "M4 5h16v2H4zm0 6h16v2H4zm0 6h10v2H4z" },
  { id: "cup", label: "Cup", icon: "M6 3h12v3a6 6 0 0 1-4.5 5.8V15h2.5v2h2v2h-12v-2h2v-2H13v-3.2A6 6 0 0 1 6 6V3zm-3 2h3v3a3 3 0 0 1-3-3zm18 0h-3v3a3 3 0 0 0 3-3z" },
  { id: "tactics", label: "Tactics", icon: "M9 3l3 2 3-2 4 3-2 3v10a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9L5 6z" },
  { id: "trade", label: "Trade", icon: "M7 7h11l-3-3 1.5-1.5L22 8l-5.5 5.5L15 12l3-3H7zm10 10H6l3 3-1.5 1.5L2 16l5.5-5.5L9 12l-3 3h11z" },
  { id: "stats", label: "Stats", icon: "M4 20V10h4v10zm6 0V4h4v16zm6 0v-7h4v7z" },
  { id: "feed", label: "Feed", icon: "M4 4h16v4H4zm0 6h16v4H4zm0 6h10v4H4z" },
];

export function isCupWeek(state: GameState): boolean {
  return state.weekIdx < state.calendar.length && state.calendar[state.weekIdx].kind === "cup";
}

const SIDE_LABEL: Record<HubTab, string> = {
  home: "Home",
  league: "League",
  cup: "Cup",
  tactics: "Tactics",
  trade: "Trade",
  stats: "Stats",
  feed: "Feed",
};

export default function HubScreen() {
  const { state } = useGame();
  const cup = isCupWeek(state);
  const club = state.clubs.find((c) => c.id === state.userClubId);
  return (
    <div className="min-h-dvh flex flex-col lg:flex-row">
      {/* desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-[248px] shrink-0 border-r border-line bg-bg1/50 px-4 py-6 sticky top-0 self-start h-dvh overflow-y-auto">
        {club && (
          <div className="flex items-center gap-3 mb-6">
            <Crest colors={club.colors} variant={club.crest} size={44} />
            <div className="min-w-0">
              <div className="display uppercase font-bold text-chalk leading-tight truncate">{club.name}</div>
              <div className="text-[11px] text-mut mt-0.5">
                Season {state.season} · Wk {Math.min(state.weekIdx + 1, state.calendar.length)}
              </div>
            </div>
          </div>
        )}
        {TABS.map((t) => (
          <SideTab key={t.id} id={t.id} label={SIDE_LABEL[t.id]} icon={t.icon} active={state.tab === t.id} />
        ))}
        <div className="mt-auto pt-6 space-y-2">
          {cup && (
            <div className="display text-[10px] uppercase tracking-widest text-gold font-bold border border-gold/40 rounded-lg px-3 py-2 text-center">
              ★ Cup week ★
            </div>
          )}
          <div className="text-[10px] text-dim px-1">
            {STYLES[club?.style ?? "counter"].short} · {club?.formation} · Mgr {state.manager}
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar state={state} cup={cup} />
        <div className="flex-1 overflow-y-auto pb-24 lg:pb-10">
          {state.tab === "home" && <HomeTab cup={cup} />}
          {state.tab === "league" && <LeagueTab />}
          {state.tab === "cup" && <CupTab />}
          {state.tab === "tactics" && <TacticsTab />}
          {state.tab === "trade" && <TradeTab />}
          {state.tab === "stats" && <StatsTab />}
          {state.tab === "feed" && <FeedTab />}
        </div>
        <nav className="lg:hidden fixed bottom-0 inset-x-0 max-w-[480px] mx-auto bg-bg1/95 backdrop-blur border-t border-line grid grid-cols-7">
          {TABS.map((t) => (
            <TabButton key={t.id} id={t.id} label={t.label} icon={t.icon} active={state.tab === t.id} />
          ))}
        </nav>
      </div>
    </div>
  );
}

function TabButton({ id, label, icon, active }: { id: HubTab; label: string; icon: string; active: boolean }) {
  const { dispatch } = useGame();
  return (
    <button onClick={() => dispatch({ type: "SET_TAB", tab: id })} className={`flex flex-col items-center gap-1 py-2.5 ${active ? "text-turf" : "text-dim"}`}>
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="currentColor" d={icon} />
      </svg>
      <span className="display text-[8.5px] uppercase tracking-wider font-semibold">{label}</span>
    </button>
  );
}

function SideTab({ id, label, icon, active }: { id: HubTab; label: string; icon: string; active: boolean }) {
  const { dispatch } = useGame();
  return (
    <button
      onClick={() => dispatch({ type: "SET_TAB", tab: id })}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${active ? "bg-turfdark text-turf" : "text-mut hover:bg-bg2 hover:text-chalk"}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="currentColor" d={icon} />
      </svg>
      <span className="display text-xs uppercase tracking-wider font-semibold">{label}</span>
    </button>
  );
}

function TopBar({ state, cup }: { state: GameState; cup: boolean }) {
  const club = clubById(state, state.userClubId);
  return (
    <header className={`px-4 pt-5 pb-3 flex items-center gap-3 border-b pitch-lines ${cup ? "bg-gold/10 border-gold/30" : "bg-bg1 border-line"}`}>
      <Crest colors={club.colors} variant={club.crest} size={34} />
      <div className="flex-1 min-w-0">
        <div className="display uppercase font-bold text-[15px] text-chalk truncate leading-tight">{club.name}</div>
        <div className="text-[11px] text-mut">
          {STYLES[club.style].short} · {club.formation} · Mgr {state.manager}
        </div>
      </div>
      <div className="text-right">
        {cup ? (
          <div className="display text-[10px] uppercase tracking-widest text-gold font-bold border border-gold/40 rounded px-1.5 py-0.5 mb-0.5">Cup week</div>
        ) : (
          <div className="display text-[10px] uppercase tracking-widest text-dim">Season {state.season}</div>
        )}
        <div className="num display text-sm text-chalk font-semibold">
          Wk {Math.min(state.weekIdx + 1, state.calendar.length)}/{state.calendar.length}
        </div>
      </div>
    </header>
  );
}

/* ---------------- HOME ---------------- */

function HomeTab({ cup }: { cup: boolean }) {
  const { state, dispatch } = useGame();
  const { open } = useOverlay();
  const [confirmReset, setConfirmReset] = useState(false);
  const info = nextMatchInfo(state);
  const table = standings(state);
  const myRow = table.find((r) => r.clubId === state.userClubId)!;
  const myPos = table.indexOf(myRow) + 1;
  const club = clubById(state, state.userClubId);
  const latest = state.posts[0];

  const oppId = info.fixture
    ? info.fixture.home === state.userClubId ? info.fixture.away : info.fixture.home
    : info.tie
      ? info.tie.home === state.userClubId ? info.tie.away : info.tie.home
      : "";
  const opp = oppId ? clubById(state, oppId) : null;

  return (
    <div className="px-4 pt-4 space-y-4 lg:space-y-0 lg:grid lg:grid-cols-[1.15fr_0.85fr] lg:gap-5 lg:items-start">
      <div className="space-y-4">
      <Panel className={`p-4 pitch-lines ${cup ? "border-gold/40" : ""}`}>
        <div className="flex items-center justify-between">
          <SectionLabel>Next fixture</SectionLabel>
          <span className={`display text-[10px] uppercase tracking-widest ${cup ? "text-gold" : "text-dim"}`}>{info.roundLabel}</span>
        </div>
        {opp ? (
          <>
            <div className="flex items-center justify-between mt-1">
              <div className="flex flex-col items-center gap-1.5 w-24">
                <Crest colors={club.colors} variant={club.crest} size={42} />
                <ClubLink clubId={club.id} name={club.short} className="display text-[11px] uppercase text-chalk font-semibold text-center leading-tight" />
              </div>
              <div className="display text-2xl font-bold text-dim">VS</div>
              <div className="flex flex-col items-center gap-1.5 w-24">
                <Crest colors={opp.colors} variant={opp.crest} size={42} />
                <ClubLink clubId={opp.id} name={opp.short} className="display text-[11px] uppercase text-chalk font-semibold text-center leading-tight" />
              </div>
            </div>
            <div className="text-center text-xs text-mut mt-2">
              {info.userHome ? "Home" : "Away"} · They play {STYLES[opp.style].short.toLowerCase()} ({opp.formation}) · Coach {opp.coach.name}
            </div>
            <div className="text-center text-[11px] text-dim mt-1">
              Form {formStr(state, club.id) || "—"} · Morale {club.morale} vs {opp.morale}
            </div>
            <div className="flex gap-2 mt-4">
              <Btn className="flex-[1.6]" variant={cup ? "gold" : "primary"} onClick={() => dispatch({ type: "START_WEEK" })}>
                {cup ? "Play cup tie" : "Play match"}
              </Btn>
              <Btn className="flex-1" variant="dark" onClick={() => dispatch({ type: "START_WEEK", simulate: true })}>
                Simulate
              </Btn>
            </div>
          </>
        ) : (
          <div className="py-2">
            <div className="text-sm text-mut">No match for you this week — the cup round plays out without you.</div>
            <Btn full className="mt-4" onClick={() => dispatch({ type: "START_WEEK" })}>
              Advance week
            </Btn>
          </div>
        )}
      </Panel>

      {(() => {
        const run = cupRunLabel(state);
        let cupValue = "Alive";
        let cupTone: "green" | "red" | "gold" = "green";
        if (run.includes("CHAMPIONS")) {
          cupValue = "Champions";
          cupTone = "gold";
        } else if (!state.cupAlive) {
          if (run.includes("runners")) {
            cupValue = "Runners-up";
            cupTone = "red";
          } else {
            cupValue = `Out · ${stageShort(run.replace("Out in the ", ""))}`;
            cupTone = "red";
          }
        } else {
          const stage = currentCupStage(state);
          if (stage) cupValue = `Alive · ${stageShort(stage)}`;
        }
        return (
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Position" value={`${myPos}${["st", "nd", "rd"][myPos - 1] ?? "th"}`} />
            <MiniStat label="Points" value={String(myRow.pts)} />
            <MiniStat label="Cup" value={cupValue} tone={cupTone} />
          </div>
        );
      })()}

      {/* trade shortcut */}
      <button onClick={() => dispatch({ type: "SET_TAB", tab: "trade" })} className="w-full bg-bg1 border border-line rounded-xl px-4 py-3 flex items-center gap-3 active:bg-bg2">
        <span className={`w-2 h-2 rounded-full ${state.tradesLeft > 0 ? "bg-turf live-dot" : "bg-dim"}`} />
        <span className="text-[13px] text-ink flex-1 text-left">
          {state.tradesLeft > 0 ? "Trade window open — negotiate a swap deal" : "Trade used this week — check league trade news"}
        </span>
        <span className="display text-[10px] uppercase text-turf">Trade →</span>
      </button>

      {/* career archive */}
      <button onClick={() => open({ kind: "career" })} className="w-full bg-bg1 border border-gold/30 rounded-xl px-4 py-3 flex items-center gap-3 active:bg-bg2">
        <span className="text-gold text-lg leading-none">🏆</span>
        <span className="text-[13px] text-ink flex-1 text-left">Career & honours — your whole managerial history</span>
        <span className="display text-[10px] uppercase text-gold">Open →</span>
      </button>
      </div>

      <div className="space-y-4">
      {/* latest post preview */}
      {latest && (
        <Panel className="p-4">
          <div className="flex items-center justify-between mb-2">
            <SectionLabel>Latest on the feed</SectionLabel>
            <button onClick={() => dispatch({ type: "SET_TAB", tab: "feed" })} className="display text-[10px] uppercase tracking-wider text-turf font-semibold">
              Open feed →
            </button>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-chalk font-semibold">{latest.handle}</span>
            <span className="text-dim num ml-auto">W{latest.week}</span>
          </div>
          <div className="text-[13px] text-ink leading-snug mt-1 line-clamp-3">{latest.text}</div>
          <div className="text-[10px] text-dim num mt-1.5">
            ♥ {latest.likes.toLocaleString()} · ⟳ {latest.rps.toLocaleString()} · 💬 {latest.comments.length}
          </div>
        </Panel>
      )}

      {/* danger zone */}
      <div className="pb-2">
        {confirmReset ? (
          <div className="flex gap-2">
            <Btn variant="danger" className="flex-1" onClick={() => dispatch({ type: "RESET" })}>
              Yes, erase career
            </Btn>
            <Btn variant="ghost" className="flex-1" onClick={() => setConfirmReset(false)}>
              Keep playing
            </Btn>
          </div>
        ) : (
          <button onClick={() => setConfirmReset(true)} className="text-[11px] text-dim underline underline-offset-2 mx-auto block">
            Reset career
          </button>
        )}
      </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" | "gold" }) {
  const color = tone === "green" ? "text-turf" : tone === "red" ? "text-clay" : tone === "gold" ? "text-gold" : "text-chalk";
  return (
    <Panel className="p-3 text-center">
      <div className="display text-[9px] uppercase tracking-widest text-dim">{label}</div>
      <div className={`display num font-bold mt-0.5 ${color} ${value.length > 6 ? "text-[13px] leading-tight" : "text-lg"}`}>{value}</div>
    </Panel>
  );
}

/* ---------------- LEAGUE ---------------- */

function LeagueTab() {
  const { state } = useGame();
  const [view, setView] = useState<"table" | "fixtures">("table");
  return (
    <div className="px-2 pt-3">
      <div className="flex gap-1.5 px-2 pb-3">
        <button
          onClick={() => setView("table")}
          className={`display text-[11px] font-semibold px-3 py-1.5 rounded-md ${view === "table" ? "bg-chalk text-bg0" : "bg-bg2 text-mut"}`}
        >
          Table
        </button>
        <button
          onClick={() => setView("fixtures")}
          className={`display text-[11px] font-semibold px-3 py-1.5 rounded-md ${view === "fixtures" ? "bg-chalk text-bg0" : "bg-bg2 text-mut"}`}
        >
          Schedule
        </button>
      </div>
      {view === "fixtures" ? <FixturesView /> : <TableView />}
    </div>
  );
}

function FixturesView() {
  const { state } = useGame();
  const { open } = useOverlay();
  // map league round number → week index (for report lookup)
  const roundWk = new Map<number, number>();
  state.calendar.forEach((w, i) => {
    if (w.kind === "league") roundWk.set(w.round, i);
  });
  return (
    <div className="px-2 pb-4 space-y-4">
      {state.rounds.map((round, r) => (
        <div key={r}>
          <div className="display text-[10px] uppercase tracking-widest text-dim font-semibold mb-1.5">Matchweek {r + 1}</div>
          <div className="space-y-1">
            {round.map((f, i) => {
              const home = clubById(state, f.home);
              const away = clubById(state, f.away);
              const userIn = f.home === state.userClubId || f.away === state.userClubId;
              const wk = roundWk.get(r + 1);
              const report = wk !== undefined ? state.reports[String(wk)] : undefined;
              return (
                <div
                  key={i}
                  className={`flex items-center text-[12px] rounded-lg border px-2.5 py-1.5 ${userIn ? "bg-turfdark border-turf/40" : "bg-bg1 border-line"}`}
                >
                  <span className="w-2 h-2 rounded-full mr-2 shrink-0" style={{ background: home.colors[0] }} />
                  <span className={`flex-1 truncate ${userIn && f.home === state.userClubId ? "text-turf font-semibold" : "text-ink"}`}>{home.short}</span>
                  <span className="num text-chalk font-semibold mx-2 w-10 text-center">{f.played ? `${f.hg} - ${f.ag}` : "vs"}</span>
                  <span className={`flex-1 truncate text-right ${userIn && f.away === state.userClubId ? "text-turf font-semibold" : "text-ink"}`}>{away.short}</span>
                  <span className="w-2 h-2 rounded-full ml-2 shrink-0" style={{ background: away.colors[0] }} />
                  {userIn && report && (
                    <button
                      onClick={() => open({ kind: "report", wk: (wk as number) })}
                      className="display text-[9px] uppercase font-bold text-gold border border-gold/40 rounded px-1.5 py-1 ml-2 whitespace-nowrap"
                    >
                      Review
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function TableView() {
  const { state } = useGame();
  const table = standings(state);
  return (
    <div>
      <table className="w-full text-[12.5px] num">
        <thead>
          <tr className="display text-[9px] uppercase tracking-widest text-dim">
            <th className="text-left pl-2 pb-2 font-semibold w-7">#</th>
            <th className="text-left pb-2 font-semibold">Club</th>
            <th className="pb-2 font-semibold w-7">P</th>
            <th className="pb-2 font-semibold w-7">W</th>
            <th className="pb-2 font-semibold w-7">D</th>
            <th className="pb-2 font-semibold w-7">L</th>
            <th className="pb-2 font-semibold w-9">GD</th>
            <th className="pb-2 font-semibold w-9 pr-2">Pts</th>
          </tr>
        </thead>
        <tbody>
          {table.map((r, i) => {
            const club = clubById(state, r.clubId);
            const me = r.clubId === state.userClubId;
            return (
              <tr key={r.clubId} className={`border-t border-line/60 ${me ? "bg-turfdark" : i === 0 ? "bg-gold/5" : i >= table.length - 2 ? "bg-clay/5" : ""}`}>
                <td className={`pl-2 py-2 ${i === 0 ? "text-gold" : i >= table.length - 2 ? "text-clay" : "text-dim"}`}>{i + 1}</td>
                <td className="py-2">
                  <span className="flex items-center gap-2">
                    <Crest colors={club.colors} variant={club.crest} size={16} />
                    <ClubLink clubId={club.id} name={club.name} className={`truncate max-w-[120px] lg:max-w-[300px] ${me ? "text-turf font-semibold" : "text-ink"}`} />
                    <span className="text-[9px] text-dim tracking-wider">{formStr(state, r.clubId)}</span>
                  </span>
                </td>
                <td className="text-center text-mut">{r.p}</td>
                <td className="text-center text-mut">{r.w}</td>
                <td className="text-center text-mut">{r.d}</td>
                <td className="text-center text-mut">{r.l}</td>
                <td className="text-center text-mut">{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                <td className="text-center pr-2 font-bold text-chalk">{r.pts}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex gap-4 px-3 py-3 text-[10px] text-dim display uppercase tracking-wider">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gold inline-block" />Title</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-turf inline-block" />You</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-clay inline-block" />Wooden spoon</span>
      </div>
    </div>
  );
}

/* ---------------- CUP ---------------- */

function CupTab() {
  const { state } = useGame();
  const run = cupRunLabel(state);
  const champion = run.includes("CHAMPIONS");
  const out = !state.cupAlive;
  return (
    <div className="px-4 pt-4 space-y-5 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-5 lg:items-start">
      {champion ? (
        <Panel className="p-3 border-gold/50 bg-gold/10 lg:col-span-2">
          <span className="text-[13px] text-gold display uppercase font-bold tracking-wide">🏆 Cup champions — you won the whole thing</span>
        </Panel>
      ) : out ? (
        <Panel className="p-3 border-clay/50 bg-clay/10 lg:col-span-2">
          <span className="text-[13px] text-clay display uppercase font-bold tracking-wide">
            Eliminated — {run.replace("Out in the ", "out in the ").replace("Cup runners-up", "lost the final")}
          </span>
        </Panel>
      ) : (
        <Panel className="p-3 border-turf/50 bg-turf/10 lg:col-span-2">
          <span className="text-[13px] text-turf display uppercase font-bold tracking-wide">Still alive — chasing the cup</span>
        </Panel>
      )}
      {state.cup.map((round) => (
        <div key={round.name}>
          <SectionLabel>{round.name}</SectionLabel>
          <div className="space-y-1.5">
            {round.ties.map((t, i) => {
              const home = t.home ? clubById(state, t.home) : null;
              const away = t.away ? clubById(state, t.away) : null;
              const userIn = t.home === state.userClubId || t.away === state.userClubId;
              return (
                <Panel key={i} className={`px-3 py-2 ${userIn ? "border-turf/50" : ""}`}>
                  <div className="flex items-center text-[13px]">
                    <span className={`flex-1 truncate ${home ? "text-ink" : "text-dim"} ${t.played && t.winner === t.home ? "font-bold text-chalk" : ""}`}>
                      {home ? (
                        <ClubLink clubId={home.id} name={home.name} className={t.played && t.winner === t.home ? "font-bold text-chalk" : ""} />
                      ) : (
                        "TBD"
                      )}{" "}
                      {userIn && t.home === state.userClubId && <span className="text-turf">●</span>}
                    </span>
                    <span className="num text-mut mx-3">{t.played ? `${t.hg} - ${t.ag}` : "vs"}</span>
                    <span className={`flex-1 truncate text-right ${away ? "text-ink" : "text-dim"} ${t.played && t.winner === t.away ? "font-bold text-chalk" : ""}`}>
                      {userIn && t.away === state.userClubId && <span className="text-turf">●</span>}{" "}
                      {away ? (
                        <ClubLink clubId={away.id} name={away.name} className={t.played && t.winner === t.away ? "font-bold text-chalk" : ""} />
                      ) : (
                        "TBD"
                      )}
                    </span>
                  </div>
                  {t.pens && <div className="text-[10px] text-dim text-center num">pens {t.pens[0]}-{t.pens[1]}</div>}
                </Panel>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- TACTICS ---------------- */

function TacticsTab() {
  const { state, dispatch } = useGame();
  const { open } = useOverlay();
  const club = clubById(state, state.userClubId);
  const slots = FORMATIONS[club.formation].slots;
  const players = club.players;
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const assigned = state.lineup.map((id) => (id ? byId.get(id) ?? null : null));
  const [selected, setSelected] = useState<number | null>(null);
  const [openPlayer, setOpenPlayer] = useState<Player | null>(null);
  const [drag, setDrag] = useState<{ slot: number; x: number; y: number; moved: boolean } | null>(null);
  const slotEls = useRef<Map<number, HTMLDivElement>>(new Map());
  /** press-and-hold on a chip reveals the card; dragging cancels it */
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedViaPress = useRef(false);
  const st = STYLES[club.style];

  const styleFit = useMemo(
    () => Math.round(styleFitOf(assigned, slots, st) * 100),
    [assigned, slots, st],
  );

  const placeAt = (slotIdx: number, playerId: string) => {
    dispatch({ type: "ASSIGN_SLOT", slot: slotIdx, playerId });
    setSelected(null);
  };

  const onSlotTap = (idx: number) => {
    if (selected !== null && selected !== idx) {
      const sel = assigned[selected];
      const p = assigned[idx];
      if (sel) placeAt(idx, sel.id);
      else if (p) placeAt(selected, p.id);
      return;
    }
    setSelected(idx === selected ? null : idx);
  };

  const findSlotAt = (x: number, y: number): number | null => {
    for (const [idx, el] of slotEls.current.entries()) {
      const r = el.getBoundingClientRect();
      if (x >= r.left - 14 && x <= r.right + 14 && y >= r.top - 14 && y <= r.bottom + 14) return idx;
    }
    return null;
  };

  const dragPlayer = drag ? assigned[drag.slot] : null;

  return (
    <div className="px-4 pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <SectionLabel>Formation · {club.formation}</SectionLabel>
          <div className="text-[11px] text-mut -mt-1">
            {st.label} needs {st.keyNote}. Hold a chip to see the player card · drag to move · tap to swap.
          </div>
        </div>
        <Btn variant="dark" className="text-xs px-3 py-2" onClick={() => dispatch({ type: "AUTO_LINEUP" })}>
          Auto
        </Btn>
      </div>

      <div className="flex items-center gap-2">
        <span className="display text-[10px] uppercase tracking-widest text-dim">Style fit</span>
        <div className="flex-1 h-2 bg-bg3 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${styleFit >= 100 ? "bg-gold" : styleFit >= 93 ? "bg-turf" : styleFit >= 88 ? "bg-mut" : "bg-clay"}`}
            style={{ width: `${Math.min(100, ((styleFit - 78) / 36) * 100)}%` }}
          />
        </div>
        <span className={`num display text-sm font-bold ${styleFit >= 100 ? "text-gold" : styleFit >= 93 ? "text-turf" : "text-clay"}`}>{styleFit}%</span>
      </div>

      <div className="relative w-full lg:max-w-[540px] lg:mx-auto rounded-xl border border-turfdeep overflow-hidden select-none" style={{ aspectRatio: "10/11", background: "repeating-linear-gradient(0deg,#17402a 0px,#17402a 34px,#1a4a30 34px,#1a4a30 68px)" }}>
        <svg className="absolute inset-0 w-full h-full opacity-25" viewBox="0 0 100 110" preserveAspectRatio="none">
          <rect x="4" y="4" width="92" height="102" fill="none" stroke="#f2efe4" strokeWidth="0.6" />
          <line x1="4" y1="55" x2="96" y2="55" stroke="#f2efe4" strokeWidth="0.6" />
          <circle cx="50" cy="55" r="11" fill="none" stroke="#f2efe4" strokeWidth="0.6" />
          <rect x="26" y="4" width="48" height="16" fill="none" stroke="#f2efe4" strokeWidth="0.6" />
          <rect x="26" y="90" width="48" height="16" fill="none" stroke="#f2efe4" strokeWidth="0.6" />
        </svg>
        {slots.map((slot, i) => {
          const p = assigned[i];
          const fit = p ? slotFit(p, slot.pos) : 0;
          const ring = !p ? "border-dim" : fit >= 0.99 ? "border-turf" : fit >= 0.88 ? "border-gold" : "border-clay";
          const isSel = selected === i;
          return (
            <div
              key={i}
              ref={(el) => {
                if (el) slotEls.current.set(i, el);
                else slotEls.current.delete(i);
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
            >
              <button
                className={`w-[58px] rounded-lg border-2 px-1 py-1 text-center transition-transform touch-none ${ring} ${isSel ? "scale-110 bg-chalk/20" : "bg-bg0/75"} ${drag?.slot === i && drag.moved ? "opacity-30" : ""}`}
                onPointerDown={(e) => {
                  if (!p) {
                    onSlotTap(i);
                    return;
                  }
                  e.currentTarget.setPointerCapture?.(e.pointerId);
                  setDrag({ slot: i, x: e.clientX, y: e.clientY, moved: false });
                  // hold to reveal the card…
                  if (pressTimer.current) clearTimeout(pressTimer.current);
                  pressTimer.current = setTimeout(() => {
                    openedViaPress.current = true;
                    open({ kind: "card", playerId: p.id });
                  }, 380);
                }}
                onPointerMove={(e) => {
                  if (drag && drag.slot === i) {
                    const moved = drag.moved || Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 10;
                    // …but dragging cancels it
                    if (moved && !drag.moved && pressTimer.current) {
                      clearTimeout(pressTimer.current);
                      pressTimer.current = null;
                    }
                    setDrag({ slot: i, x: e.clientX, y: e.clientY, moved });
                  }
                }}
                onPointerUp={(e) => {
                  if (pressTimer.current) {
                    clearTimeout(pressTimer.current);
                    pressTimer.current = null;
                  }
                  if (drag && drag.slot === i && drag.moved) {
                    const target = findSlotAt(e.clientX, e.clientY);
                    const mover = assigned[drag.slot];
                    if (target !== null && target !== drag.slot && mover) placeAt(target, mover.id);
                    setDrag(null);
                  } else {
                    setDrag(null);
                    if (openedViaPress.current) {
                      openedViaPress.current = false; // the card already opened — don't also select
                      return;
                    }
                    onSlotTap(i);
                  }
                }}
                onPointerLeave={() => {
                  if (pressTimer.current) {
                    clearTimeout(pressTimer.current);
                    pressTimer.current = null;
                  }
                }}
              >
                <span className="display text-[8px] uppercase tracking-wider text-dim block leading-none">{slot.pos}</span>
                {p ? (
                  <>
                    <span className={`num display text-[9px] font-bold block leading-none mt-0.5 ${ovr(p) >= 80 ? "text-gold" : ovr(p) >= 70 ? "text-turf" : "text-mut"}`}>
                      {ovr(p)}
                    </span>
                    <span className={`display text-[9px] font-semibold leading-tight block truncate ${p.id === state.youId ? "text-gold" : "text-chalk"}`}>
                      {shortName(p.name)}
                    </span>
                  </>
                ) : (
                  <span className="display text-[10px] text-dim block">empty</span>
                )}
              </button>
            </div>
          );
        })}
      </div>
      <div className="text-[10px] text-dim">
        Hold a chip for the card · drag to move · tap to select. Border colour: <span className="text-turf">natural</span> · <span className="text-gold">adapted</span> · <span className="text-clay">out of position</span>
      </div>

      <div className="space-y-1.5 pb-2 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-2 lg:items-start">
        {[...players].sort((a, b) => ovr(b) - ovr(a)).map((p) => {
          const slotIdx = assigned.findIndex((x) => x?.id === p.id);
          const slot = slotIdx >= 0 ? slots[slotIdx] : null;
          const fit = slot ? slotFit(p, slot.pos) : 0;
          const learning = Object.entries(p.learn ?? {}).filter(([, v]) => v != null);
          return (
            <button key={p.id} onClick={() => setOpenPlayer(p)} className="w-full flex items-center gap-2.5 bg-bg1 border border-line rounded-lg px-2.5 py-2 text-left">
              <Ovr v={ovr(p)} />
              <span className="flex-1 min-w-0">
                <span className="text-[13px] text-chalk font-medium truncate block">
                  {p.name} {p.id === state.youId && <span className="text-gold">★</span>}
                </span>
                <span className="text-[11px] text-mut">
                  {p.pos}
                  {p.pos2 ? ` · also ${p.pos2}` : ""}
                  {p.pos3 ? `/${p.pos3}` : ""} · {p.age}y {slot && (
                    <span className={fit >= 0.99 ? "text-turf" : fit >= 0.88 ? "text-gold" : "text-clay"}>
                      · in {slot.pos} {Math.round(fit * 100)}%
                    </span>
                  )}
                  {learning.map(([pos, v]) => (
                    <span key={pos} className="text-[#7fd0c1]"> · learning {pos} {Math.round(v ?? 0)}%</span>
                  ))}
                </span>
              </span>
              <PosTag pos={p.pos} />
            </button>
          );
        })}
      </div>

      {/* coaching staff */}
      <Panel className="p-4 mb-2">
        <SectionLabel>Head coach — playstyle + formation</SectionLabel>
        <div className="flex items-center gap-3 bg-bg2 rounded-lg px-3 py-2.5 border border-line">
          <span className="flex-1">
            <span className="text-[14px] text-chalk font-semibold block">{club.coach.name}</span>
            <span className="text-[11px] text-mut">{STYLES[club.coach.style].label} · {club.coach.formation}</span>
          </span>
          <span className="display text-[10px] uppercase text-turf border border-turf/40 rounded px-2 py-1">Current</span>
        </div>
        <div className="text-[11px] text-dim mt-2">{STYLES[club.coach.style].desc}</div>
        <div className="mt-3 space-y-1.5">
          {state.coachPool.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-bg1 border border-line">
              <span className="flex-1 min-w-0">
                <span className="text-[13px] text-ink block truncate">{c.name}</span>
                <span className="text-[11px] text-mut">{STYLES[c.style].short} · {c.formation}</span>
              </span>
              <Btn variant="dark" className="text-xs px-3 py-1.5" onClick={() => dispatch({ type: "HIRE_COACH", coachId: c.id })}>
                Hire
              </Btn>
            </div>
          ))}
          {state.coachPool.length === 0 && <div className="text-xs text-dim">No free coaches right now.</div>}
        </div>
      </Panel>

      {drag?.moved && dragPlayer && (
        <div className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-1/2" style={{ left: drag.x, top: drag.y }}>
          <div className="bg-chalk text-bg0 display text-[11px] font-bold rounded-lg px-2 py-1 shadow-xl">
            {dragPlayer.name.split(" ")[1] ?? dragPlayer.name}
          </div>
        </div>
      )}

      {openPlayer && (
        <PlayerCard
          p={openPlayer}
          ovr={ovr(openPlayer)}
          onClose={() => setOpenPlayer(null)}
          footer={
            <Btn full variant={state.youId === openPlayer.id ? "gold" : "primary"} onClick={() => dispatch({ type: "SET_YOU", playerId: openPlayer.id })}>
              {state.youId === openPlayer.id ? "Your player ★" : "Make your player"}
            </Btn>
          }
        />
      )}
    </div>
  );
}

/* ---------------- TRADE ---------------- */

function TradeTab() {
  const { state, dispatch } = useGame();
  const { open } = useOverlay();
  const club = clubById(state, state.userClubId);
  const [giveId, setGiveId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const give = giveId ? club.players.find((p) => p.id === giveId) ?? null : null;
  const offer: TradeOffer | null = useMemo(() => (give && targetId ? genTradeOffer(state, targetId, give) : null), [state, give, targetId]);

  return (
    <div className="px-4 pt-4 space-y-4 lg:max-w-[880px]">
      <Panel className="p-4">
        <div className="flex items-center justify-between mb-1">
          <SectionLabel>Trade center</SectionLabel>
          <span className={`display text-[10px] uppercase tracking-wider px-2 py-1 rounded border ${state.tradesLeft > 0 ? "text-turf border-turf/40" : "text-dim border-line"}`}>
            {state.tradesLeft > 0 ? `${state.tradesLeft} deal left this week` : "closed until next week"}
          </span>
        </div>
        <div className="text-[11px] text-dim mb-2">
          Trades stay within a line: keeper ↔ keeper, defender ↔ defender (CB/FB), midfielder ↔ midfielder (CM/WM), attacker ↔ attacker (WF/ST).
        </div>
        {state.tradesLeft <= 0 ? (
          <div className="text-xs text-dim">One swap per week. The fax machine needs to cool off. Meanwhile, the rest of the league keeps dealing below.</div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-[11px] text-mut mb-1.5">1 · Put a player on the block</div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {club.players.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center whitespace-nowrap rounded-lg border text-xs ${giveId === p.id ? "bg-turfdark border-turf" : "bg-bg2 border-line"}`}
                  >
                    <button
                      onClick={() => {
                        setGiveId(p.id);
                        setTargetId(null);
                      }}
                      className={`flex items-center gap-1.5 px-2 py-1.5 ${giveId === p.id ? "text-chalk" : "text-mut"}`}
                    >
                      <PosTag pos={p.pos} /> {p.name.split(" ")[1] ?? p.name} <span className="num text-gold">{p.value}M</span>
                    </button>
                    <button
                      onClick={() => open({ kind: "card", playerId: p.id })}
                      className="border-l border-line px-1.5 py-1.5 text-dim font-bold"
                      aria-label={`view ${p.name}`}
                    >
                      ⓘ
                    </button>
                  </div>
                ))}
              </div>
              {give && (
                <div className="mt-2 bg-bg1 border border-turf/40 rounded-lg p-2.5 flex items-center gap-2.5">
                  <Ovr v={ovr(give)} />
                  <span className="flex-1 min-w-0">
                    <span className="text-[13px] text-chalk font-semibold block truncate">
                      {give.name} {give.id === state.youId && <span className="text-gold">★</span>}
                    </span>
                    <span className="text-[11px] text-mut">
                      {give.pos} · {give.age}y · pot <span className="num text-turf">{give.pot}</span> · {GROWTH_LABEL[give.growth]} · {give.value}M
                    </span>
                  </span>
                  <button
                    onClick={() => open({ kind: "card", playerId: give.id })}
                    className="display text-[10px] uppercase font-bold text-turf border border-turf/40 rounded-md px-2 py-1.5 whitespace-nowrap"
                  >
                    Full card
                  </button>
                </div>
              )}
            </div>
            {give && (
              <div>
                <div className="text-[11px] text-mut mb-1.5">2 · Knock on a door</div>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {state.clubs.filter((c) => !c.isUser).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setTargetId(c.id)}
                      className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2 py-1.5 text-xs ${targetId === c.id ? "bg-turfdark border-turf text-chalk" : "bg-bg2 border-line text-mut"}`}
                    >
                      <Crest colors={c.colors} variant={c.crest} size={16} /> {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {give && targetId && offer && (
              <div className={`rounded-lg border p-3 text-[13px] ${offer.accepted ? "border-turf/40 bg-turf/5" : "border-clay/40 bg-clay/5"}`}>
                <div className={offer.accepted ? "text-ink" : "text-clay"}>{offer.text}</div>
                {offer.accepted && offer.give && (
                  <>
                    <div className="text-[11px] text-mut mt-2">
                      Inspect before you sign:{" "}
                      <button
                        onClick={() => open({ kind: "card", playerId: offer.give!.id })}
                        className="text-turf underline decoration-dotted underline-offset-2"
                      >
                        open {offer.give.name}&apos;s card
                      </button>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Btn
                        full
                        variant="primary"
                        onClick={() => {
                          dispatch({ type: "APPLY_TRADE", targetId, giveId: give.id, getId: offer.give!.id });
                          setGiveId(null);
                          setTargetId(null);
                        }}
                      >
                        Accept trade
                      </Btn>
                      <Btn variant="ghost" onClick={() => setTargetId(null)}>
                        Walk away
                      </Btn>
                    </div>
                  </>
                )}
                {!offer.accepted && (
                  <Btn variant="dark" className="mt-3" onClick={() => setTargetId(null)}>
                    Try another club
                  </Btn>
                )}
              </div>
            )}
          </div>
        )}
      </Panel>

      <div>
        <SectionLabel>League trade history</SectionLabel>
        <div className="space-y-1.5 pb-2">
          {state.tradeHistory.map((t, i) => (
            <Panel key={i} className="px-3 py-2.5">
              <div className="flex items-center text-[12px]">
                <span className="flex-1 truncate">
                  <PlayerLink playerId={t.paId} name={t.pa} className="text-ink" />
                </span>
                <span className="display text-gold text-[10px] mx-2">⇄</span>
                <span className="flex-1 truncate text-right">
                  <PlayerLink playerId={t.pbId} name={t.pb} className="text-ink" />
                </span>
              </div>
              <div className="text-[10px] text-dim mt-0.5 flex justify-between gap-2">
                <ClubLink clubId={t.aId} name={t.aName} className="text-dim truncate" />
                <span>W{t.wk}</span>
                <ClubLink clubId={t.bId} name={t.bName} className="text-dim truncate" />
              </div>
            </Panel>
          ))}
          {state.tradeHistory.length === 0 && <div className="text-xs text-dim">No deals yet. The market is quiet… too quiet.</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- STATS ---------------- */

function StatsTab() {
  const { state } = useGame();
  const boards = useMemo(() => leaderboards(state), [state]);
  const hasData = Object.keys(state.stats).length > 0;
  return (
    <div className="px-4 pt-4 space-y-4 pb-2 lg:space-y-0 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 lg:items-start">
      {!hasData && <Panel className="p-4 text-sm text-mut lg:col-span-3">No stats yet — play your first match and the numbers roll in.</Panel>}
      {boards.map((b) => (
        <Panel key={b.key} className="p-4">
          <div className="flex items-baseline justify-between mb-2">
            <SectionLabel>{b.title}</SectionLabel>
            <span className="display text-[9px] uppercase tracking-widest text-dim">{b.unit}</span>
          </div>
          {b.rows.length === 0 ? (
            <div className="text-xs text-dim">Nothing recorded yet.</div>
          ) : (
            <div className="space-y-1">
              {b.rows.map((r, i) => {
                const mine = r.clubId === state.userClubId;
                return (
                  <div key={r.playerId + i} className={`flex items-center text-[13px] rounded-lg px-2 -mx-2 py-1 ${mine ? "bg-turfdark" : ""}`}>
                    <span className={`num w-5 ${i === 0 ? "text-gold" : "text-dim"}`}>{i + 1}.</span>
                    <span className="flex-1 truncate">
                      <PlayerLink playerId={r.playerId} name={r.name} className={mine ? "text-turf font-semibold" : "text-chalk"} />
                      {mine && <span className="display text-[8px] uppercase tracking-wider text-turf ml-1.5 border border-turf/40 rounded px-1 py-0.5">You</span>}
                    </span>
                    {r.sub && <span className="text-[10px] text-dim mr-2">{r.sub}</span>}
                    <span className="text-[11px] text-dim mr-3">
                      {r.clubId ? <ClubLink clubId={r.clubId} name={clubById(state, r.clubId)?.short ?? ""} className="text-dim" /> : ""}
                    </span>
                    <span className={`num font-bold ${i === 0 ? "text-gold" : "text-ink"}`}>{Math.round(r.value * 10) / 10}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      ))}
    </div>
  );
}

/* ---------------- FEED ---------------- */

const KIND_TAG: Record<string, string> = {
  match: "text-turf border-turf/40",
  trade: "text-gold border-gold/40",
  rumor: "text-[#7fd0c1] border-[#5fb3a3]/40",
  coach: "text-chalk border-line",
  beef: "text-clay border-clay/40",
  hype: "text-gold border-gold/40",
  system: "text-mut border-line",
};

function FeedTab() {
  const { state, dispatch } = useGame();
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const openPost = state.posts.find((p) => p.id === openId) ?? null;

  return (
    <div className="px-4 pt-4 space-y-2.5 pb-2 lg:max-w-[700px]">
      <div className="text-[11px] text-dim mb-1">The football internet. Unfiltered, unhinged, mostly wrong. Tap a post for comments.</div>
      {state.posts.map((p) => (
        <button key={p.id} onClick={() => setOpenId(p.id)} className="w-full text-left bg-bg1 border border-line rounded-xl px-3.5 py-3 active:bg-bg2">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-chalk font-semibold">{p.handle}</span>
            <span className={`display uppercase text-[8px] tracking-widest border rounded px-1 py-0.5 ${KIND_TAG[p.kind]}`}>{p.kind}</span>
            <span className="text-dim ml-auto num">W{p.week}</span>
          </div>
          <div className="text-[13px] text-ink leading-snug mt-1">{p.text}</div>
          <div className="text-[10px] text-dim num mt-1.5">
            ♥ {p.likes.toLocaleString()} · ⟳ {p.rps.toLocaleString()} · 💬 {p.comments.length}
          </div>
        </button>
      ))}
      {state.posts.length === 0 && <Panel className="p-4 text-sm text-mut">Nothing posted yet. Suspicious.</Panel>}

      {openPost && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-bg0/70" onClick={() => setOpenId(null)}>
          <div className="w-full max-w-[480px] bg-bg1 border border-line rounded-t-2xl p-5 pb-6 max-h-[85dvh] flex flex-col fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-chalk font-semibold">{openPost.handle}</span>
              <span className="text-dim num ml-auto">W{openPost.week}</span>
            </div>
            <div className="text-[14px] text-ink leading-snug mt-1.5">{openPost.text}</div>
            <div className="text-[10px] text-dim num mt-1.5">♥ {openPost.likes.toLocaleString()} · ⟳ {openPost.rps.toLocaleString()}</div>

            <div className="mt-3 mb-1 display text-[10px] uppercase tracking-widest text-dim font-semibold">Comments · {openPost.comments.length}</div>
            <div className="flex-1 overflow-y-auto space-y-2 min-h-[60px]">
              {openPost.comments.map((c) => (
                <div key={c.id} className="bg-bg2 rounded-lg px-3 py-2">
                  <div className="flex items-center text-[10px]">
                    <span className="text-chalk font-semibold">{c.handle}</span>
                    <span className="text-dim num ml-auto">♥ {c.likes}</span>
                  </div>
                  <div className="text-[12.5px] text-mut mt-0.5">{c.text}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Say something unhinged…"
                maxLength={140}
                className="flex-1 bg-bg2 border border-line rounded-lg px-3 py-2.5 text-[13px] outline-none focus:border-turf placeholder:text-dim"
              />
              <Btn
                variant="primary"
                disabled={draft.trim().length === 0}
                onClick={() => {
                  dispatch({ type: "ADD_COMMENT", postId: openPost.id, text: draft.trim() });
                  setDraft("");
                }}
              >
                Post
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
