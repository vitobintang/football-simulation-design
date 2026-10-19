"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Crest, Ovr, PlayerCard, PosTag, SectionLabel, Stars } from "@/components/ui";
import { POS_LABEL, STYLES } from "@/lib/data";
import { ovr } from "@/lib/gen";
import { useGame } from "@/lib/state";
import type { MatchReport, Player } from "@/lib/types";

export type OverlayTarget =
  | { kind: "card"; playerId?: string; name?: string }
  | { kind: "roster"; clubId: string }
  | { kind: "career" }
  | { kind: "report"; wk: number };

const Ctx = createContext<{ open: (t: OverlayTarget) => void } | null>(null);

export function useOverlay() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useOverlay outside provider");
  return c;
}

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<OverlayTarget | null>(null);
  return (
    <Ctx.Provider value={{ open: setTarget }}>
      {children}
      <OverlayHost target={target} setTarget={setTarget} />
    </Ctx.Provider>
  );
}

function OverlayHost({ target, setTarget }: { target: OverlayTarget | null; setTarget: (t: OverlayTarget | null) => void }) {
  const { state } = useGame();
  const all = useMemo(() => [...state.clubs, ...state.lower], [state.clubs, state.lower]);

  if (!target) return null;

  if (target.kind === "career") {
    return <CareerView onClose={() => setTarget(null)} />;
  }

  if (target.kind === "report") {
    const rep = state.reports[String(target.wk)];
    if (!rep) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg0/75" onClick={() => setTarget(null)}>
        <div
          className="w-full max-w-[480px] lg:max-w-[720px] bg-bg1 border border-line rounded-t-2xl max-h-[90dvh] flex flex-col fade-up"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center px-4 pt-4">
            <span className="display text-[11px] uppercase tracking-widest text-dim font-semibold">
              Match report · W{rep.wk} · {rep.comp === "C" ? "Domestic cup" : "League"}
            </span>
            <button onClick={() => setTarget(null)} className="ml-auto text-dim text-2xl leading-none px-2 py-1" aria-label="close">
              ✕
            </button>
          </div>
          <ReportBody rep={rep} />
        </div>
      </div>
    );
  }

  if (target.kind === "roster") {
    const club = all.find((c) => c.id === target.clubId);
    if (!club) return null;
    const sorted = [...club.players].sort((a, b) => ovr(b) - ovr(a));
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg0/75" onClick={() => setTarget(null)}>
        <div
          className="w-full max-w-[480px] lg:max-w-[580px] bg-bg1 border border-line rounded-t-2xl p-5 pb-8 max-h-[86dvh] flex flex-col fade-up"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3">
            <Crest colors={club.colors} variant={club.crest} size={44} />
            <div className="flex-1 min-w-0">
              <div className="display uppercase font-bold text-lg text-chalk leading-tight truncate">{club.name}</div>
              <div className="text-[11px] text-mut mt-0.5">
                {STYLES[club.style].short} · {club.formation} · Coach {club.coach.name}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Stars n={club.tier} />
                <span className="text-[10px] text-dim num">Morale {club.morale}{club.lower ? " · 2nd division" : ""}</span>
              </div>
            </div>
            <button onClick={() => setTarget(null)} className="text-dim text-2xl leading-none px-2 py-1" aria-label="close">
              ✕
            </button>
          </div>
          <div className="mt-4 overflow-y-auto space-y-1.5">
            {sorted.map((p) => (
              <button
                key={p.id}
                onClick={() => setTarget({ kind: "card", playerId: p.id })}
                className="w-full flex items-center gap-2.5 bg-bg2 border border-line rounded-lg px-2.5 py-2 text-left active:bg-bg3"
              >
                <Ovr v={ovr(p)} />
                <span className="flex-1 min-w-0">
                  <span className="text-[13px] text-chalk font-medium truncate block">{p.name}</span>
                  <span className="text-[11px] text-mut">
                    {POS_LABEL[p.pos]} · {p.age}y
                  </span>
                </span>
                <PosTag pos={p.pos} />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // player card by id (or name fallback)
  let player: Player | undefined;
  if (target.playerId) {
    for (const c of all) {
      player = c.players.find((p) => p.id === target.playerId);
      if (player) break;
    }
  }
  if (!player && target.name) {
    for (const c of all) {
      player = c.players.find((p) => p.name === target.name);
      if (player) break;
    }
  }
  if (!player) return null;
  return <PlayerCard p={player} ovr={ovr(player)} onClose={() => setTarget(null)} />;
}

/** Clickable player name → opens their card, wherever they play. */
export function PlayerLink({ playerId, name, className = "" }: { playerId?: string; name: string; className?: string }) {
  const { open } = useOverlay();
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        open({ kind: "card", playerId, name });
      }}
      className={`underline decoration-dotted underline-offset-2 active:opacity-70 ${className}`}
    >
      {name}
    </button>
  );
}

/** Clickable club name → opens their squad list. */
export function ClubLink({ clubId, name, className = "" }: { clubId: string; name: string; className?: string }) {
  const { open } = useOverlay();
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        open({ kind: "roster", clubId });
      }}
      className={`underline decoration-dotted underline-offset-2 active:opacity-70 ${className}`}
    >
      {name}
    </button>
  );
}

/* ---------------- career dossier ---------------- */

function CareerView({ onClose }: { onClose: () => void }) {
  const { state } = useGame();
  const hist = state.careerHistory;
  const tot = hist.reduce(
    (acc, s) => ({ w: acc.w + s.w, d: acc.d + s.d, l: acc.l + s.l }),
    { w: 0, d: 0, l: 0 },
  );
  const played = tot.w + tot.d + tot.l;
  const winPct = played ? Math.round((tot.w / played) * 100) : 0;
  const leagues = hist.filter((s) => s.pos === 1).length;
  const cups = hist.filter((s) => s.cupRun.includes("CHAMPIONS")).length;
  const fmt: Record<string, number> = {};
  const ment: Record<string, number> = {};
  for (const s of hist) {
    for (const [k, v] of Object.entries(s.formations)) fmt[k] = (fmt[k] ?? 0) + v;
    for (const [k, v] of Object.entries(s.mentalities)) ment[k] = (ment[k] ?? 0) + v;
  }
  const fmtTot = Object.values(fmt).reduce((a, b) => a + b, 0);
  const mentTot = Object.values(ment).reduce((a, b) => a + b, 0);
  const mentLabel: Record<string, string> = { def: "Defensive", bal: "Balanced", att: "Attacking" };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg0/75" onClick={onClose}>
      <div
        className="w-full max-w-[480px] lg:max-w-[640px] bg-bg1 border border-line rounded-t-2xl max-h-[90dvh] flex flex-col fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-5 pt-4 pb-2">
          <span className="display text-[13px] uppercase tracking-[0.2em] text-turf font-bold">Manager career · {state.manager}</span>
          <button onClick={onClose} className="ml-auto text-dim text-2xl leading-none px-2 py-1" aria-label="close">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-8">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-bg2 border border-line rounded-lg p-2.5">
              <div className="display text-[9px] uppercase tracking-widest text-dim">Win rate</div>
              <div className="display num text-xl font-bold text-turf">{winPct}%</div>
            </div>
            <div className="bg-bg2 border border-line rounded-lg p-2.5">
              <div className="display text-[9px] uppercase tracking-widest text-dim">W · D · L</div>
              <div className="display num text-sm font-bold text-chalk mt-1">
                {tot.w} · {tot.d} · {tot.l}
              </div>
            </div>
            <div className="bg-bg2 border border-line rounded-lg p-2.5">
              <div className="display text-[9px] uppercase tracking-widest text-dim">Leagues</div>
              <div className="display num text-xl font-bold text-gold">{leagues}</div>
            </div>
            <div className="bg-bg2 border border-line rounded-lg p-2.5">
              <div className="display text-[9px] uppercase tracking-widest text-dim">Cups</div>
              <div className="display num text-xl font-bold text-gold">{cups}</div>
            </div>
          </div>

          {hist.length > 0 && (
            <>
              <div className="mt-4">
                <SectionLabel>Season by season</SectionLabel>
                <div className="space-y-1.5">
                  {[...hist].reverse().map((s) => (
                    <div key={s.season} className="flex items-center text-[12.5px] bg-bg2 border border-line rounded-lg px-3 py-2">
                      <span className="num text-dim w-12">S{s.season}</span>
                      <span className={`display font-bold w-14 ${s.pos === 1 ? "text-gold" : "text-chalk"}`}>
                        {s.pos === 1 ? "1st 🏆" : `${s.pos}${["st", "nd", "rd"][s.pos - 1] ?? "th"}`}
                      </span>
                      <span className="flex-1 text-mut truncate">{s.cupRun.includes("CHAMPIONS") ? "Cup winners 🏆" : s.cupRun}</span>
                      <span className="num text-ink">
                        {s.w}-{s.d}-{s.l}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <SectionLabel>Formations used</SectionLabel>
                  <div className="space-y-1.5">
                    {Object.entries(fmt)
                      .sort((a, b) => b[1] - a[1])
                      .map(([k, v]) => (
                        <div key={k} className="text-[12px]">
                          <div className="flex justify-between mb-0.5">
                            <span className="text-ink">{k}</span>
                            <span className="num text-dim">{fmtTot ? Math.round((v / fmtTot) * 100) : 0}%</span>
                          </div>
                          <div className="h-1.5 bg-bg3 rounded-full overflow-hidden">
                            <div className="h-full bg-turf rounded-full" style={{ width: `${fmtTot ? (v / fmtTot) * 100 : 0}%` }} />
                          </div>
                        </div>
                      ))}
                    {fmtTot === 0 && <div className="text-[11px] text-dim">No matches yet.</div>}
                  </div>
                </div>
                <div>
                  <SectionLabel>Mentalities used</SectionLabel>
                  <div className="space-y-1.5">
                    {Object.entries(ment)
                      .sort((a, b) => b[1] - a[1])
                      .map(([k, v]) => (
                        <div key={k} className="text-[12px]">
                          <div className="flex justify-between mb-0.5">
                            <span className="text-ink">{mentLabel[k] ?? k}</span>
                            <span className="num text-dim">{mentTot ? Math.round((v / mentTot) * 100) : 0}%</span>
                          </div>
                          <div className="h-1.5 bg-bg3 rounded-full overflow-hidden">
                            <div className="h-full bg-gold rounded-full" style={{ width: `${mentTot ? (v / mentTot) * 100 : 0}%` }} />
                          </div>
                        </div>
                      ))}
                    {mentTot === 0 && <div className="text-[11px] text-dim">No matches yet.</div>}
                  </div>
                </div>
              </div>
            </>
          )}
          {hist.length === 0 && <div className="text-[12px] text-dim mt-4">Your first season is still being written. Finish it to open the archive.</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- match report body (shared) ---------------- */

export function ReportBody({ rep }: { rep: MatchReport }) {
  const totalPos = rep.stats[0].pos + rep.stats[1].pos;
  const hp = totalPos ? Math.round((rep.stats[0].pos / totalPos) * 100) : 50;
  const sheet = (side: 0 | 1) => rep.lines.filter((l) => l.side === side).sort((a, b) => b.rating - a.rating);
  const passAcc = (side: 0 | 1) => {
    const lines = sheet(side);
    const p = lines.reduce((a, l) => a + l.passes, 0);
    const s = lines.reduce((a, l) => a + l.psucc, 0);
    return p ? Math.round((s / p) * 100) : 0;
  };
  const cards = (side: 0 | 1) => {
    const lines = sheet(side);
    return `${lines.reduce((a, l) => a + l.yel, 0)}🟨 ${lines.reduce((a, l) => a + l.red, 0)}🟥`;
  };
  const StatRow = ({ label, a, b }: { label: string; a: number; b: number }) => {
    const r = a + b === 0 ? 0.5 : a / (a + b);
    return (
      <div className="flex items-center gap-2 text-[12px] num">
        <span className="w-8 text-right text-chalk">{a}</span>
        <div className="flex-1 flex h-1.5 rounded-full overflow-hidden bg-bg3">
          <span className="h-full" style={{ width: `${r * 100}%`, background: rep.home.colors[0] }} />
          <span className="h-full" style={{ width: `${(1 - r) * 100}%`, background: rep.away.colors[0] }} />
        </div>
        <span className="w-8 text-chalk">{b}</span>
        <span className="w-24 text-right display text-[9px] uppercase tracking-wider text-dim">{label}</span>
      </div>
    );
  };

  return (
    <div className="overflow-y-auto px-4 pb-8">
      {/* scoreline */}
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="flex flex-col items-center gap-1 w-24">
          <Crest colors={rep.home.colors} variant={rep.home.crest} size={40} />
          <span className="display text-[11px] uppercase font-semibold text-chalk text-center leading-tight">{rep.home.short}</span>
        </div>
        <div className="text-center">
          <div className="display num text-4xl font-bold text-chalk">
            {rep.hg}
            <span className="text-dim mx-1">-</span>
            {rep.ag}
          </div>
          {rep.pens && <div className="display num text-[11px] text-gold font-semibold mt-0.5">pens {rep.pens[0]}-{rep.pens[1]}</div>}
        </div>
        <div className="flex flex-col items-center gap-1 w-24">
          <Crest colors={rep.away.colors} variant={rep.away.crest} size={40} />
          <span className="display text-[11px] uppercase font-semibold text-chalk text-center leading-tight">{rep.away.short}</span>
        </div>
      </div>

      {/* scorers */}
      {rep.goals.length > 0 && (
        <div className="bg-bg2 rounded-lg p-3 mb-3 space-y-1">
          {rep.goals.map((g, i) => (
            <div key={i} className="flex items-center text-[12px]">
              <span className="w-2 h-2 rounded-full mr-2" style={{ background: (g.side === 0 ? rep.home : rep.away).colors[0] }} />
              <span className="num text-dim w-8">{g.min}&apos;</span>
              <span className="flex-1 text-ink truncate">{g.name}</span>
              <span className="text-[10px] text-dim">{(g.side === 0 ? rep.home : rep.away).short}</span>
            </div>
          ))}
        </div>
      )}

      {rep.motm && (
        <div className="bg-gold/10 border border-gold/30 rounded-lg px-3 py-2 mb-3 text-[12px] flex items-center">
          <span className="text-gold display uppercase text-[9px] tracking-widest font-bold mr-2">MOTM</span>
          <span className="flex-1 text-chalk font-semibold truncate">{rep.motm.name}</span>
          <span className="num text-gold font-bold">{rep.motm.rating}</span>
        </div>
      )}

      {/* team totals */}
      <div className="space-y-1.5 mb-4">
        <StatRow label="Possession %" a={hp} b={100 - hp} />
        <StatRow label="Shots" a={rep.stats[0].sh} b={rep.stats[1].sh} />
        <StatRow label="On target" a={rep.stats[0].sot} b={rep.stats[1].sot} />
        <StatRow label="Saves" a={rep.stats[0].sv} b={rep.stats[1].sv} />
        <StatRow label="Corners" a={rep.stats[0].ck} b={rep.stats[1].ck} />
        <StatRow label="Pass acc %" a={passAcc(0)} b={passAcc(1)} />
      </div>
      <div className="flex justify-between text-[11px] text-dim mb-4">
        <span>Cards: {cards(0)}</span>
        <span>Cards: {cards(1)}</span>
      </div>

      {/* player sheets */}
      {([0, 1] as const).map((side) => {
        const team = side === 0 ? rep.home : rep.away;
        return (
          <div key={side} className="mb-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: team.colors[0] }} />
              <span className="display text-[11px] uppercase tracking-widest text-chalk font-bold">{team.name}</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center text-[9px] display uppercase tracking-wider text-dim px-2">
                <span className="flex-1">Player</span>
                <span className="w-8 text-center">Pos</span>
                <span className="w-7 text-center">G</span>
                <span className="w-7 text-center">A</span>
                <span className="w-8 text-center">Sv</span>
                <span className="w-8 text-center">Tk</span>
                <span className="w-9 text-center">Pass</span>
                <span className="w-9 text-center">Rate</span>
              </div>
              {sheet(side).map((l) => (
                <div key={l.playerId} className={`flex items-center text-[12px] rounded-lg px-2 py-1 ${l.rating >= 8 ? "bg-gold/10" : "bg-bg2"}`}>
                  <span className="flex-1 text-ink truncate">
                    {l.name} {l.yel > 0 && <span className="text-gold">🟨</span>} {l.red > 0 && <span className="text-clay">🟥</span>}
                  </span>
                  <span className="w-8 text-center"><PosTag pos={l.pos} /></span>
                  <span className="w-7 text-center num text-chalk">{l.goals || "-"}</span>
                  <span className="w-7 text-center num text-chalk">{l.assists || "-"}</span>
                  <span className="w-8 text-center num text-mut">{l.saves || "-"}</span>
                  <span className="w-8 text-center num text-mut">{l.twon || "-"}</span>
                  <span className="w-9 text-center num text-mut">{l.passes ? `${l.passes}` : "-"}</span>
                  <span className={`w-9 text-center num font-bold ${l.rating >= 8 ? "text-gold" : l.rating >= 6.5 ? "text-turf" : "text-clay"}`}>
                    {l.rating.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
