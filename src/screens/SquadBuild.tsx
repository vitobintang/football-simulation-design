"use client";

import { useMemo, useState } from "react";
import { Btn, Crest, Ovr, PlayerCard, PosTag } from "@/components/ui";
import { POS_LIST, STYLES } from "@/lib/data";
import { formationNeeds, ovr } from "@/lib/gen";
import { useGame } from "@/lib/state";
import type { Pos } from "@/lib/types";

export default function SquadBuildScreen() {
  const { state, dispatch } = useGame();
  const [filter, setFilter] = useState<Pos | "ALL">("ALL");
  const [openId, setOpenId] = useState<string | null>(null);
  const club = state.clubs.find((c) => c.id === state.userClubId)!;
  const needs = formationNeeds(club.formation);

  const signed = state.market.filter((p) => state.signedIds.includes(p.id));
  const open = state.market.find((p) => p.id === openId) ?? null;

  const pool = useMemo(() => {
    const list = filter === "ALL" ? state.market : state.market.filter((p) => p.pos === filter);
    return [...list].sort((a, b) => ovr(b) - ovr(a));
  }, [state.market, filter]);

  const counts: Record<Pos, number> = { GK: 0, CB: 0, FB: 0, CM: 0, WM: 0, WF: 0, ST: 0 };
  for (const p of signed) counts[p.pos]++;
  const coverageOk = POS_LIST.every((pos) => counts[pos] >= needs[pos]);
  const canConfirm = signed.length === 11 && coverageOk;

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="px-5 pt-7 pb-3 flex items-center gap-3">
        <Crest colors={club.colors} variant={club.crest} size={40} />
        <div className="flex-1">
          <div className="display text-[11px] tracking-[0.25em] text-turf font-semibold">STEP 3 / 3 · DRAFT DAY</div>
          <h2 className="display uppercase text-xl font-bold text-chalk leading-tight">Build your XI</h2>
          <div className="text-[11px] text-mut">
            Coach plays {STYLES[club.style].short} · {club.formation}
          </div>
        </div>
        <div className="text-right">
          <div className="display text-[11px] uppercase tracking-wider text-dim font-semibold">Budget</div>
          <div className={`display num text-2xl font-bold ${state.budget < 10 ? "text-clay" : "text-gold"}`}>{state.budget}M</div>
        </div>
      </header>

      {/* coverage vs coach's formation */}
      <div className="px-4 pb-2">
        <div className="flex gap-1.5 flex-wrap text-[11px] num">
          {POS_LIST.map((pos) => {
            if (needs[pos] === 0) return null;
            const ok = counts[pos] >= needs[pos];
            return (
              <span key={pos} className={`px-2 py-1 rounded-md border ${ok ? "border-turf/40 text-turf bg-turf/10" : "border-line text-mut bg-bg1"}`}>
                {pos} {counts[pos]}/{needs[pos]}
              </span>
            );
          })}
          <span className={`ml-auto px-2 py-1 rounded-md border ${signed.length === 11 ? "border-turf/40 text-turf bg-turf/10" : "border-line text-mut bg-bg1"}`}>
            XI {signed.length}/11
          </span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 pt-2 min-h-[38px]">
          {signed.length === 0 && (
            <span className="text-dim text-xs self-center">Sign 11 players. Stars are expensive — the cap is real. Pick one as your star.</span>
          )}
          {signed.map((p) => (
            <button
              key={p.id}
              onClick={() => setOpenId(p.id)}
              className="flex items-center gap-1.5 bg-bg2 border border-line rounded-lg px-2 py-1.5 whitespace-nowrap"
            >
              {p.id === state.youId && <span className="text-gold text-xs">★</span>}
              <span className="text-xs text-ink">{p.name.split(" ")[1] ?? p.name}</span>
              <PosTag pos={p.pos} />
            </button>
          ))}
        </div>
      </div>

      {/* market */}
      <div className="px-4 pb-1 flex gap-1.5 overflow-x-auto">
        {(["ALL", ...POS_LIST] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`display text-[11px] font-semibold px-2.5 py-1 rounded-md whitespace-nowrap ${filter === t ? "bg-chalk text-bg0" : "bg-bg2 text-mut"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-28 space-y-1.5 mt-1 lg:grid lg:grid-cols-2 lg:gap-2 lg:space-y-0 lg:max-w-[940px] lg:mx-auto lg:w-full lg:items-start">
        {pool.map((p) => {
          const isSigned = state.signedIds.includes(p.id);
          const affordable = state.budget >= p.value;
          const r = ovr(p);
          return (
            <div key={p.id} className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 ${isSigned ? "bg-turfdark border-turf/50" : "bg-bg1 border-line"}`}>
              <button className="flex items-center gap-2.5 flex-1 min-w-0 text-left" onClick={() => setOpenId(p.id)}>
                <Ovr v={r} />
                <span className="flex-1 min-w-0">
                  <span className="text-[13px] text-chalk font-medium truncate block">
                    {p.name} {p.id === state.youId && <span className="text-gold">★</span>}
                  </span>
                  <span className="text-[11px] text-mut">
                    {p.nat} · {p.age}y
                  </span>
                </span>
                <PosTag pos={p.pos} />
              </button>
              <span className="num text-[12px] text-gold w-9 text-right">{p.value}M</span>
              {isSigned ? (
                <button onClick={() => dispatch({ type: "UNSIGN", playerId: p.id })} className="display text-[10px] font-bold text-clay border border-clay/40 rounded-md px-2 py-1.5">
                  DROP
                </button>
              ) : (
                <button
                  onClick={() => dispatch({ type: "SIGN", playerId: p.id })}
                  disabled={!affordable || signed.length >= 11}
                  className="display text-[10px] font-bold text-turf border border-turf/40 rounded-md px-2 py-1.5 disabled:opacity-30"
                >
                  SIGN
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-0 inset-x-0 max-w-[480px] lg:max-w-[940px] mx-auto bg-bg0/95 backdrop-blur border-t border-line px-4 py-3">
        <Btn full variant={canConfirm ? "gold" : "dark"} disabled={!canConfirm} onClick={() => dispatch({ type: "CONFIRM_SQUAD" })}>
          {signed.length < 11
            ? `Sign ${11 - signed.length} more player${11 - signed.length === 1 ? "" : "s"}`
            : !coverageOk
              ? "Cover every position of your formation"
              : "Confirm squad & reveal the league"}
        </Btn>
      </div>

      {open && (
        <PlayerCard
          p={open}
          ovr={ovr(open)}
          onClose={() => setOpenId(null)}
          footer={
            state.signedIds.includes(open.id) ? (
              <>
                <Btn variant="danger" className="flex-1" onClick={() => dispatch({ type: "UNSIGN", playerId: open.id })}>
                  Release
                </Btn>
                <Btn
                  variant={state.youId === open.id ? "gold" : "dark"}
                  className="flex-1"
                  onClick={() => dispatch({ type: "SET_YOU", playerId: open.id })}
                >
                  {state.youId === open.id ? "Your player ★" : "Make your player"}
                </Btn>
              </>
            ) : (
              <Btn full variant="primary" disabled={state.budget < open.value || signed.length >= 11} onClick={() => dispatch({ type: "SIGN", playerId: open.id })}>
                {state.budget < open.value ? "Not enough budget" : `Sign for ${open.value}M`}
              </Btn>
            )
          }
        />
      )}
    </div>
  );
}
