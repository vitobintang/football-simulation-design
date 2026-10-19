"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Btn, Crest, PosTag } from "@/components/ui";
import { chooseMakeshiftGK, continueSecondHalf, createMatch, outcomeOf, setMentality, step, type MatchState } from "@/lib/engine";
import { ovr } from "@/lib/gen";
import { ReportBody, useOverlay } from "@/lib/overlay";
import { buildReport, clubById, nextMatchInfo, resolveUserLineup } from "@/lib/season";
import { useGame } from "@/lib/state";
import type { Mentality } from "@/lib/types";

const MENT_LABEL: Record<Mentality, string> = { def: "Defensive", bal: "Balanced", att: "Attacking" };

export default function MatchScreen() {
  const { state, dispatch } = useGame();
  const { open } = useOverlay();
  const info = useMemo(() => nextMatchInfo(state), [state]);
  const userClub = clubById(state, state.userClubId);
  const oppId = info.fixture
    ? info.fixture.home === state.userClubId ? info.fixture.away : info.fixture.home
    : info.tie
      ? info.tie.home === state.userClubId ? info.tie.away : info.tie.home
      : "";
  const opp = oppId ? clubById(state, oppId) : null;

  const isCup = info.kind === "cup";
  const ref = useRef<MatchState | null>(null);
  if (!ref.current && opp) {
    const homeClub = info.userHome ? userClub : opp;
    const awayClub = info.userHome ? opp : userClub;
    const userLineup = resolveUserLineup(state);
    ref.current = createMatch(homeClub, awayClub, {
      cup: isCup,
      youId: state.youId,
      homeLineup: info.userHome ? userLineup : undefined,
      awayLineup: info.userHome ? undefined : userLineup,
    });
  }

  const [, force] = useReducer((x: number) => x + 1, 0);
  const [speed, setSpeed] = useState(1);
  const [halted, setHalted] = useState(false);
  const [statsView, setStatsView] = useState(false);
  const [ftDismissed, setFtDismissed] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const finished = useRef(false);
  const simRan = useRef(false);

  const st = ref.current!;
  const userSideIdx = info.userHome ? 0 : 1;
  const userSide = userSideIdx === 0 ? st.home : st.away;

  useEffect(() => {
    if (halted || !st) return;
    const phase = (): MatchState["phase"] => st.phase;
    const id = setInterval(() => {
      if (phase() === "ht" || phase() === "ft" || phase() === "pick") {
        setHalted(true);
        return;
      }
      step(st);
      force();
      if (phase() === "ht" || phase() === "ft" || phase() === "pick") setHalted(true);
    }, 750 / speed);
    return () => clearInterval(id);
  }, [speed, halted, st]);

  // "Simulate" from the home screen: fast-forward the whole match instantly
  useEffect(() => {
    if (!state.autoSim || simRan.current) return;
    simRan.current = true;
    const ph = (): MatchState["phase"] => st.phase;
    let guard = 0;
    while (ph() !== "ft" && guard++ < 500) {
      if (ph() === "ht") continueSecondHalf(st);
      else if (ph() === "pick") {
        const side = st.home.pendingGKPick ? st.home : st.away;
        const victim = side.lineup
          .filter((p) => p.pos !== "GK" && !side.off.has(p.id) && p.id !== side.makeshiftGK)
          .sort((a, b) => ovr(a) - ovr(b))[0];
        if (victim) chooseMakeshiftGK(st, victim.id);
        else st.phase = "live";
      } else step(st);
    }
    force();
    setHalted(true);
  }, [state.autoSim, st]);

  const skip = () => {
    let guard = 0;
    const ph = (): MatchState["phase"] => st.phase;
    while (ph() !== "ft" && guard++ < 500) {
      if (ph() === "ht") continueSecondHalf(st);
      else if (ph() === "pick") {
        const side = st.home.pendingGKPick ? st.home : st.away;
        const victim = side.lineup
          .filter((p) => p.pos !== "GK" && !side.off.has(p.id) && p.id !== side.makeshiftGK)
          .sort((a, b) => ovr(a) - ovr(b))[0];
        if (victim) chooseMakeshiftGK(st, victim.id);
      } else step(st);
    }
    force();
    setHalted(true);
  };

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    dispatch({ type: "FINISH_USER_MATCH", outcome: outcomeOf(st) });
  };

  const review = useMemo(() => {
    if (!showReview) return null;
    const out = outcomeOf(st);
    const homeId = info.userHome ? userClub.id : opp?.id ?? "";
    const awayId = info.userHome ? opp?.id ?? "" : userClub.id;
    return buildReport(state, out, state.weekIdx + 1, isCup ? "C" : "L", homeId, awayId);
  }, [showReview]); // eslint-disable-line react-hooks/exhaustive-deps

  const [hs, as] = st.score;
  const userGoals = userSideIdx === 0 ? hs : as;
  const oppGoals = userSideIdx === 0 ? as : hs;
  const totalPos = st.stats[0].pos + st.stats[1].pos;
  const homePosPct = totalPos ? Math.round((st.stats[0].pos / totalPos) * 100) : 50;
  const lastEvent = st.events[st.events.length - 1];
  const goalFlash = lastEvent?.type === "goal";
  const events = [...st.events].reverse().slice(0, 40);

  const ftUserWon = st.pens
    ? st.pens.score[userSideIdx] > st.pens.score[userSideIdx === 0 ? 1 : 0]
    : userGoals > oppGoals;
  const ftDraw = !st.pens && userGoals === oppGoals;

  const FtActions = (
    <>
      <Btn
        variant="dark"
        className="flex-1"
        onClick={() => {
          setShowReview(true);
        }}
      >
        Match review
      </Btn>
      <Btn variant="gold" className="flex-1" onClick={finish}>
        Continue
      </Btn>
    </>
  );

  return (
    <div className="min-h-dvh flex flex-col">
      {/* scoreboard */}
      <div
        className={`px-4 pt-6 pb-4 border-b pitch-lines lg:w-full lg:max-w-[760px] lg:mx-auto ${
          isCup ? "bg-gold/10 border-gold/30" : "bg-bg1 border-line"
        } ${goalFlash ? "goal-flash" : ""}`}
      >
        {isCup && (
          <div className="display text-[10px] uppercase tracking-[0.3em] text-gold font-bold text-center mb-2">
            ★ Domestic cup night ★
          </div>
        )}
        <div className="flex items-center justify-center gap-1.5 mb-3">
          <span className={`w-1.5 h-1.5 rounded-full ${st.phase === "ft" ? "bg-dim" : isCup ? "bg-gold live-dot" : "bg-clay live-dot"}`} />
          <span className={`display text-[11px] uppercase tracking-[0.2em] font-semibold ${isCup ? "text-gold" : "text-mut"}`}>
            {info.roundLabel} · {st.phase === "ht" ? "Half-time" : st.phase === "pen" ? "Penalties" : st.phase === "ft" ? "Full-time" : `${st.min}'`}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <button className="flex flex-col items-center gap-1 w-24" onClick={() => open({ kind: "roster", clubId: st.home.clubId })}>
            <Crest colors={st.home.colors} variant={st.home.crest} size={40} />
            <span className="display text-[11px] uppercase font-semibold text-chalk underline decoration-dotted underline-offset-2">{st.home.short}</span>
          </button>
          <div className="display num text-[44px] font-bold text-chalk leading-none">
            {hs}<span className="text-dim mx-1">-</span>{as}
          </div>
          <button className="flex flex-col items-center gap-1 w-24" onClick={() => open({ kind: "roster", clubId: st.away.clubId })}>
            <Crest colors={st.away.colors} variant={st.away.crest} size={40} />
            <span className="display text-[11px] uppercase font-semibold text-chalk underline decoration-dotted underline-offset-2">{st.away.short}</span>
          </button>
        </div>

        <div className="mt-4 space-y-1.5 text-[11px] num">
          <LiveStatRow label="Possession" a={`${homePosPct}%`} b={`${100 - homePosPct}%`} ratio={homePosPct / 100} c1={st.home.colors[0]} c2={st.away.colors[0]} />
          <LiveStatRow label="Shots" a={String(st.stats[0].sh)} b={String(st.stats[1].sh)} ratio={ratio(st.stats[0].sh, st.stats[1].sh)} c1={st.home.colors[0]} c2={st.away.colors[0]} />
          <LiveStatRow label="On target" a={String(st.stats[0].sot)} b={String(st.stats[1].sot)} ratio={ratio(st.stats[0].sot, st.stats[1].sot)} c1={st.home.colors[0]} c2={st.away.colors[0]} />
          <LiveStatRow label="Saves" a={String(st.stats[0].sv)} b={String(st.stats[1].sv)} ratio={ratio(st.stats[0].sv, st.stats[1].sv)} c1={st.home.colors[0]} c2={st.away.colors[0]} />
        </div>
      </div>

      {/* controls */}
      <div className="px-4 py-3 border-b border-line bg-bg0 flex items-center gap-2 flex-wrap lg:w-full lg:max-w-[760px] lg:mx-auto">
        <div className="flex rounded-lg border border-line overflow-hidden">
          {(["def", "bal", "att"] as Mentality[]).map((m) => (
            <button
              key={m}
              disabled={st.phase === "ft"}
              onClick={() => {
                setMentality(st, userSideIdx, m);
                force();
              }}
              className={`display text-[10px] uppercase font-bold px-2.5 py-2 ${userSide.mentality === m ? (m === "att" ? "bg-clay text-chalk" : m === "def" ? "bg-bg3 text-chalk" : "bg-turfdeep text-chalk") : "text-dim bg-bg1"}`}
            >
              {MENT_LABEL[m]}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border border-line overflow-hidden ml-auto">
          {[1, 2, 4].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`display text-[10px] font-bold px-2.5 py-2 num ${speed === s ? "bg-bg3 text-chalk" : "text-dim bg-bg1"}`}
            >
              {s}x
            </button>
          ))}
        </div>
        {st.phase === "live" && (
          <button onClick={() => setHalted((h) => !h)} className="display text-[10px] uppercase font-bold text-chalk border border-line rounded-lg px-3 py-2 bg-bg2">
            {halted ? "Resume" : "Pause"}
          </button>
        )}
        <button onClick={skip} className="display text-[10px] uppercase font-bold text-mut border border-line rounded-lg px-3 py-2">
          Skip
        </button>
        <button
          onClick={() => setStatsView((v) => !v)}
          className={`display text-[10px] uppercase font-bold border rounded-lg px-3 py-2 ${statsView ? "text-chalk bg-bg3 border-line" : "text-mut border-line"}`}
        >
          {statsView ? "Live feed" : "Live stats"}
        </button>
      </div>

      {/* live stats page */}
      {statsView ? (
        <LiveStatsPage st={st} />
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5 lg:w-full lg:max-w-[760px] lg:mx-auto">
          {events.map((e, i) => (
            <div
              key={st.events.length - i}
              className={`flex gap-2.5 items-start rounded-lg px-3 py-2 ${i === 0 ? "ticker-in" : ""} ${
                e.type === "goal" ? "bg-gold/10 border border-gold/30" : e.type === "card" ? "bg-clay/5" : "bg-bg1/70"
              }`}
            >
              <span className="num text-[11px] text-dim w-8 pt-0.5">{e.min}'</span>
              {e.side !== -1 && (
                <span
                  className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                  style={{ background: e.side === 0 ? st.home.colors[0] : st.away.colors[0] }}
                  title={e.side === 0 ? st.home.name : st.away.name}
                />
              )}
              <span className={`text-[13px] leading-snug flex-1 ${e.type === "goal" ? "text-gold font-semibold" : e.side === userSideIdx ? "text-ink" : "text-mut"}`}>
                {e.type === "goal" && e.side === userSideIdx && st.goals.some((g) => g.playerId === state.youId && g.min === e.min)
                  ? `YOUR STAR! ${e.text}`
                  : e.text}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* GK red card — pick who wears the gloves */}
      {st.phase === "pick" && (() => {
        const pendingSide = st.home.pendingGKPick ? st.home : st.away;
        const candidates = pendingSide.lineup.filter(
          (p) => p.pos !== "GK" && !pendingSide.off.has(p.id) && p.id !== pendingSide.makeshiftGK,
        );
        return (
          <div className="fixed inset-0 z-40 bg-bg0/90 flex items-center justify-center px-6">
            <div className="w-full max-w-[420px] fade-up">
              <div className="display text-[12px] uppercase tracking-[0.3em] text-clay font-bold text-center">Keeper sent off!</div>
              <div className="text-center text-sm text-mut mt-2 mb-4">
                Choose who goes in goal. Everyone keeps equally badly — but their slot in your shape is sacrificed.
              </div>
              <div className="grid grid-cols-2 gap-1.5 max-h-[46dvh] overflow-y-auto">
                {candidates.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      chooseMakeshiftGK(st, p.id);
                      setHalted(false);
                      force();
                    }}
                    className="flex items-center gap-2 bg-bg1 border border-line rounded-lg px-2.5 py-2 text-left active:bg-bg2"
                  >
                    <PosTag pos={p.pos} />
                    <span className="text-[13px] text-chalk truncate flex-1">{p.name.split(" ")[1] ?? p.name}</span>
                    <span className="num text-[11px] text-dim">{ovr(p)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* penalty shootout drama */}
      {st.phase === "pen" && <PenDrama st={st} />}

      {/* HT overlay */}
      {st.phase === "ht" && (
        <div className="fixed inset-0 z-40 bg-bg0/85 flex items-center justify-center px-6">
          <div className="w-full max-w-[420px] text-center fade-up">
            <div className="display text-[12px] uppercase tracking-[0.3em] text-dim">Half-time</div>
            <div className="display num text-6xl font-bold text-chalk my-3">
              {hs}<span className="text-dim mx-2">-</span>{as}
            </div>
            <div className="text-sm text-mut mb-6">
              {userGoals > oppGoals ? "You lead. Keep the shape or push for more?" : userGoals < oppGoals ? "You trail. Time to change something." : "Level. The second half decides it."}
            </div>
            <Btn
              full
              onClick={() => {
                continueSecondHalf(st);
                setHalted(false);
                force();
              }}
            >
              Start second half
            </Btn>
          </div>
        </div>
      )}

      {/* FT overlay */}
      {st.phase === "ft" && !ftDismissed && (
        <div className="fixed inset-0 z-40 bg-bg0/90 flex items-center justify-center px-6 overflow-y-auto">
          <div className="w-full max-w-[420px] fade-up py-6">
            <div className="flex items-center">
              <div className="display text-[12px] uppercase tracking-[0.3em] text-dim text-center flex-1">
                {isCup && "Cup tie · "}Full-time
              </div>
              <button onClick={() => setFtDismissed(true)} className="text-dim text-2xl leading-none px-2" aria-label="close">
                ✕
              </button>
            </div>
            <div className="display num text-6xl font-bold text-center my-3">
              <span className={hs > as ? "text-turf" : "text-chalk"}>{hs}</span>
              <span className="text-dim mx-2">-</span>
              <span className={as > hs ? "text-turf" : "text-chalk"}>{as}</span>
            </div>
            {st.pens && (
              <div className="text-center display text-gold font-semibold mb-2 num">
                {ftUserWon ? "Won" : "Lost"} on penalties {st.pens.score[userSideIdx]}-{st.pens.score[userSideIdx === 0 ? 1 : 0]}
              </div>
            )}
            <div className="text-center mb-4">
              <span
                className={`display uppercase tracking-wide text-sm font-bold px-3 py-1 rounded ${
                  ftUserWon ? "bg-turf/15 text-turf" : ftDraw ? "bg-bg2 text-mut" : "bg-clay/15 text-clay"
                }`}
              >
                {ftUserWon ? "Victory" : ftDraw ? "Draw" : "Defeat"}
              </span>
            </div>
            {st.motm && (
              <div className="text-center text-[12px] text-mut mb-4">
                Man of the match: <span className="text-gold font-semibold">{st.motm.name}</span>{" "}
                <span className="num text-chalk font-semibold">{st.motm.rating}</span>
                {st.motm.playerId === state.youId && <span className="text-gold"> ★ your star</span>}
              </div>
            )}
            {st.goals.length > 0 && (
              <div className="bg-bg1 border border-line rounded-xl p-3 mb-5 space-y-1">
                {st.goals.map((g, i) => (
                  <div key={i} className="text-[12.5px] flex items-center">
                    <span className="w-2 h-2 rounded-full mr-2 shrink-0" style={{ background: (g.side === 0 ? st.home : st.away).colors[0] }} />
                    <span className="num text-dim w-8">{g.min}'</span>
                    <span className="flex-1 text-ink truncate">
                      {g.name} {g.playerId === state.youId && <span className="text-gold">★</span>}
                    </span>
                    <span className="text-[10px] text-dim">{(g.side === 0 ? st.home : st.away).short}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">{FtActions}</div>
          </div>
        </div>
      )}

      {/* FT dismissed → floating actions */}
      {st.phase === "ft" && ftDismissed && (
        <div className="fixed bottom-0 inset-x-0 max-w-[480px] lg:max-w-[760px] mx-auto bg-bg0/95 backdrop-blur border-t border-line px-4 py-3 flex gap-2 z-30">
          {FtActions}
        </div>
      )}

      {/* full match review sheet */}
      {showReview && review && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg0/75" onClick={() => setShowReview(false)}>
          <div
            className="w-full max-w-[480px] lg:max-w-[720px] bg-bg1 border border-line rounded-t-2xl max-h-[90dvh] flex flex-col fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center px-4 pt-4">
              <span className="display text-[11px] uppercase tracking-widest text-dim font-semibold">Full match review</span>
              <button onClick={() => setShowReview(false)} className="ml-auto text-dim text-2xl leading-none px-2 py-1" aria-label="close">
                ✕
              </button>
            </div>
            <ReportBody rep={review} />
          </div>
        </div>
      )}
    </div>
  );
}

function ratio(a: number, b: number) {
  const t = a + b;
  return t === 0 ? 0.5 : a / t;
}

function LiveStatRow({ label, a, b, ratio: r, c1, c2 }: { label: string; a: string; b: string; ratio: number; c1: string; c2: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 text-right text-chalk">{a}</span>
      <span className="flex-1 flex h-1 rounded-full overflow-hidden bg-bg3">
        <span className="h-full" style={{ width: `${r * 100}%`, background: c1 }} />
        <span className="h-full" style={{ width: `${(1 - r) * 100}%`, background: c2 }} />
      </span>
      <span className="w-8 text-chalk">{b}</span>
      <span className="w-20 text-dim text-[10px] display uppercase tracking-wider text-right">{label}</span>
    </div>
  );
}

/* ---------------- live stats page ---------------- */

function LiveStatsPage({ st }: { st: MatchState }) {
  const totalPos = st.stats[0].pos + st.stats[1].pos;
  const hp = totalPos ? Math.round((st.stats[0].pos / totalPos) * 100) : 50;
  const sheet = (side: 0 | 1) => {
    const s = side === 0 ? st.home : st.away;
    return s.lineup
      .map((p) => ({ p, line: s.perf[p.id] }))
      .sort((x, y) => y.line.goals - x.line.goals || y.line.assists - x.line.assists || ovr(y.p) - ovr(x.p));
  };
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 lg:w-full lg:max-w-[760px] lg:mx-auto">
      <div className="bg-bg1 border border-line rounded-xl p-3 space-y-1.5 text-[12px] num">
        <div className="flex items-center gap-2">
          <span className="w-8 text-right text-chalk">{hp}%</span>
          <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-bg3">
            <span style={{ width: `${hp}%`, background: st.home.colors[0] }} />
            <span style={{ width: `${100 - hp}%`, background: st.away.colors[0] }} />
          </div>
          <span className="w-8 text-chalk">{100 - hp}%</span>
          <span className="w-24 text-right display text-[9px] uppercase tracking-wider text-dim">Possession</span>
        </div>
        {([
          ["Shots", st.stats[0].sh, st.stats[1].sh],
          ["On target", st.stats[0].sot, st.stats[1].sot],
          ["Saves", st.stats[0].sv, st.stats[1].sv],
          ["Corners", st.stats[0].ck, st.stats[1].ck],
        ] as [string, number, number][]).map(([label, a, b]) => (
          <div key={label} className="flex items-center">
            <span className="w-8 text-right text-chalk">{a}</span>
            <span className="flex-1 text-center display text-[9px] uppercase tracking-wider text-dim">{label}</span>
            <span className="w-8 text-chalk">{b}</span>
          </div>
        ))}
      </div>

      {([0, 1] as const).map((side) => {
        const team = side === 0 ? st.home : st.away;
        return (
          <div key={side}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: team.colors[0] }} />
              <span className="display text-[11px] uppercase tracking-widest text-chalk font-bold">{team.name}</span>
            </div>
            <div className="space-y-1">
              {sheet(side).map(({ p, line }) => (
                <div key={p.id} className={`flex items-center text-[12px] rounded-lg px-2 py-1.5 ${line.goals > 0 ? "bg-gold/10" : "bg-bg1"}`}>
                  <span className="flex-1 text-ink truncate">
                    {p.name} {p.id === st.home.youId || p.id === st.away.youId ? <span className="text-gold">★</span> : null}
                    {line.yel > 0 && " 🟨"}
                    {line.red > 0 && " 🟥"}
                  </span>
                  <PosTag pos={p.pos} />
                  <span className="num w-8 text-center text-chalk">{line.goals || "-"}</span>
                  <span className="num w-8 text-center text-mut">{line.assists || "-"}</span>
                  <span className="num w-8 text-center text-mut">{line.saves || "-"}</span>
                  <span className="num w-9 text-center text-mut">{line.twon || "-"}</span>
                  <span className="num w-11 text-center text-mut">{Math.round(line.passes)}</span>
                </div>
              ))}
              <div className="flex items-center text-[9px] display uppercase tracking-wider text-dim px-2 pt-0.5">
                <span className="flex-1">Live performance</span>
                <span className="w-8 text-center">G</span>
                <span className="w-8 text-center">A</span>
                <span className="w-8 text-center">Sv</span>
                <span className="w-9 text-center">Tk</span>
                <span className="w-11 text-center">Pass</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- penalty shootout drama ---------------- */

function PenDrama({ st }: { st: MatchState }) {
  const pens = st.pens!;
  const kicks = pens.kicks;
  const last = kicks.length ? kicks[kicks.length - 1] : null;
  const lastIdx = kicks.length - 1;
  // deterministic corners per kick so the animation feels choreographed
  const goalCornerLeft = lastIdx % 2 === 0;
  const keeperLeft = last ? (last.goal ? !goalCornerLeft : goalCornerLeft) : true;
  const ballClass = last
    ? last.goal
      ? goalCornerLeft
        ? "pen-ball-gl"
        : "pen-ball-gr"
      : keeperLeft
        ? "pen-ball-sl"
        : "pen-ball-sr"
    : "";
  const shooter = last ? (last.side === 0 ? st.home : st.away) : st.home;

  return (
    <div className="fixed inset-0 z-40 bg-bg0/95 flex items-center justify-center px-6">
      <div className="w-full max-w-[420px] text-center fade-up">
        <div className="display text-[11px] uppercase tracking-[0.3em] text-gold font-bold mb-1">Penalty shootout</div>
        <div className="display num text-3xl font-bold text-chalk mb-3">
          {pens.score[0]}<span className="text-dim mx-1">-</span>{pens.score[1]}
        </div>

        <div key={lastIdx} className="relative w-[300px] h-[210px] mx-auto overflow-hidden rounded-xl border border-gold/30" style={{ background: "linear-gradient(180deg,#0d2818 0%,#17402a 55%,#1a4a30 100%)" }}>
          {/* goal frame + net */}
          <div className="absolute left-1/2 top-5 -translate-x-1/2 w-[220px] h-[74px] border-[3px] border-chalk/80 border-b-0 rounded-t-sm">
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg,transparent 0 10px,rgba(242,239,228,.4) 10px 11px),repeating-linear-gradient(0deg,transparent 0 10px,rgba(242,239,228,.4) 10px 11px)",
              }}
            />
          </div>
          {/* keeper */}
          <svg
            className={`absolute left-1/2 top-[58px] -translate-x-1/2 ${last ? (keeperLeft ? "pen-keeper-left" : "pen-keeper-right") : ""}`}
            width="46"
            height="62"
            viewBox="0 0 46 62"
          >
            <circle cx="23" cy="10" r="7" fill="#e8d9c0" />
            <rect x="12" y="18" width="22" height="24" rx="7" fill="#e4b54e" />
            <rect x="2" y="16" width="12" height="5" rx="2.5" fill="#e4b54e" transform="rotate(-24 8 18)" />
            <rect x="32" y="16" width="12" height="5" rx="2.5" fill="#e4b54e" transform="rotate(24 38 18)" />
            <rect x="14" y="42" width="7" height="17" rx="3" fill="#241f1a" />
            <rect x="25" y="42" width="7" height="17" rx="3" fill="#241f1a" />
          </svg>
          {/* penalty spot */}
          <div className="absolute left-1/2 bottom-10 -translate-x-1/2 w-1.5 h-1 rounded-full bg-chalk/50" />
          {/* ball */}
          <div
            className={`absolute left-1/2 bottom-5 -translate-x-1/2 w-5 h-5 rounded-full shadow-lg ${ballClass}`}
            style={{ backgroundImage: "radial-gradient(circle at 35% 30%, #ffffff, #c9c4b4)" }}
          />
          {/* result flash */}
          {last && (
            <div className="absolute inset-0 flex items-center justify-center pen-result pointer-events-none">
              <span
                className={`display text-4xl font-bold px-4 py-1 rounded-lg ${last.goal ? "text-gold bg-bg0/60" : "text-clay bg-bg0/60"}`}
              >
                {last.goal ? "GOAL!" : "SAVED!"}
              </span>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-center gap-4">
          <PenDots kicks={kicks.filter((k) => k.side === 0)} color={st.home.colors[0]} />
          <span className="text-[12px] text-mut">
            {last ? (
              <>
                <span className="text-chalk font-semibold">{last.name}</span> ({shooter.short})
              </>
            ) : (
              "First kick…"
            )}
          </span>
          <PenDots kicks={kicks.filter((k) => k.side === 1)} color={st.away.colors[0]} />
        </div>
      </div>
    </div>
  );
}

function PenDots({ kicks, color }: { kicks: { goal: boolean }[]; color: string }) {
  return (
    <span className="flex gap-1">
      {kicks.map((k, i) => (
        <span key={i} className="w-2.5 h-2.5 rounded-full border border-line" style={{ background: k.goal ? color : "transparent" }} />
      ))}
      {kicks.length === 0 && <span className="w-2.5 h-2.5 rounded-full border border-line" />}
    </span>
  );
}
