"use client";

import { useState } from "react";
import { Btn, Crest, Panel, SectionLabel } from "@/components/ui";
import { STYLES } from "@/lib/data";
import { useGame } from "@/lib/state";

export default function CoachSelectScreen() {
  const { state, dispatch } = useGame();
  const [picked, setPicked] = useState<string | null>(null);
  const club = state.clubs.find((c) => c.id === state.userClubId)!;
  const coach = state.coachPool.find((c) => c.id === picked);

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="px-5 pt-8 pb-4 flex items-center gap-3">
        <Crest colors={club.colors} variant={club.crest} size={38} />
        <div>
          <div className="display text-[13px] tracking-[0.3em] text-turf font-semibold">STEP 2 / 3 · {club.name}</div>
          <h2 className="display uppercase text-2xl font-bold text-chalk leading-tight">Choose your coach</h2>
        </div>
      </header>
      <p className="text-mut text-sm px-5 pb-3">
        No coach is better than another — they just play differently. Style and formation define how your players must be built. A wing-play coach with slow wingers will suffer.
      </p>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 lg:grid lg:grid-cols-2 lg:gap-2 lg:space-y-0 lg:max-w-[900px] lg:mx-auto lg:w-full lg:items-start">
        {state.coachPool.map((c) => {
          const st = STYLES[c.style];
          const sel = picked === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setPicked(c.id)}
              className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${sel ? "bg-turfdark border-turf" : "bg-bg1 border-line active:bg-bg2"}`}
            >
              <div className="flex items-center gap-2">
                <span className="display uppercase font-semibold text-[15px] text-chalk flex-1 truncate">{c.name}</span>
                <span className="display text-[10px] uppercase tracking-wider bg-bg2 text-mut px-2 py-1 rounded">{c.formation}</span>
              </div>
              <div className="display text-[11px] uppercase tracking-wide text-turf font-semibold mt-1">{st.label}</div>
              <div className="text-[12px] text-mut mt-0.5 leading-snug">{st.desc}</div>
              <div className="text-[11px] text-dim mt-1">Demands: {st.keyNote}</div>
            </button>
          );
        })}
      </div>

      {coach && (
        <div className="px-4 pb-4 fade-up lg:max-w-[900px] lg:mx-auto lg:w-full">
          <Panel className="p-4">
            <SectionLabel>Appointed</SectionLabel>
            <div className="display uppercase font-bold text-lg text-chalk">
              {coach.name} <span className="text-turf">· {STYLES[coach.style].short} · {coach.formation}</span>
            </div>
            <div className="text-xs text-mut mt-1">Draft players that fit this idea — or ignore it and pay the price on the pitch.</div>
            <Btn full className="mt-4" onClick={() => dispatch({ type: "CHOOSE_COACH", coachId: coach.id })}>
              Appoint coach
            </Btn>
          </Panel>
        </div>
      )}
    </div>
  );
}
