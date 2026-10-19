"use client";

import { useState } from "react";
import { Btn, Crest, Panel, SectionLabel } from "@/components/ui";
import { useGame } from "@/lib/state";

export default function ClubSelectScreen() {
  const { state, dispatch } = useGame();
  const [picked, setPicked] = useState<string | null>(null);
  const club = state.clubs.find((c) => c.id === picked);

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="px-5 pt-8 pb-4">
        <div className="display text-[13px] tracking-[0.3em] text-turf font-semibold">STEP 1 / 3</div>
        <h2 className="display uppercase text-3xl font-bold text-chalk mt-1">Choose your club</h2>
        <p className="text-mut text-sm mt-1">
          All twelve clubs start from zero. Squads, coaches and true strength are only revealed once you&apos;ve drafted your own players.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 lg:grid lg:grid-cols-2 lg:gap-2 lg:space-y-0 lg:max-w-[900px] lg:mx-auto lg:w-full lg:items-start">
        {state.clubs.map((c) => (
          <button
            key={c.id}
            onClick={() => setPicked(c.id)}
            className={`w-full flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
              picked === c.id ? "bg-turfdark border-turf" : "bg-bg1 border-line active:bg-bg2"
            }`}
          >
            <Crest colors={c.colors} variant={c.crest} size={38} />
            <span className="flex-1 min-w-0">
              <span className="display uppercase font-semibold text-[15px] text-chalk block truncate">{c.name}</span>
              <span className="text-xs text-mut block mt-0.5">A blank canvas. Your project starts here.</span>
            </span>
            <span className={`display text-[10px] uppercase tracking-wider px-2 py-1 rounded ${picked === c.id ? "bg-turf text-bg0" : "bg-bg2 text-dim"}`}>
              {picked === c.id ? "Picked" : "Free"}
            </span>
          </button>
        ))}
      </div>

      {club && (
        <div className="px-4 pb-4 fade-up lg:max-w-[900px] lg:mx-auto lg:w-full">
          <Panel className="p-4">
            <SectionLabel>Selected club</SectionLabel>
            <div className="flex items-center gap-3">
              <Crest colors={club.colors} variant={club.crest} size={44} />
              <div className="flex-1">
                <div className="display uppercase font-bold text-lg text-chalk leading-tight">{club.name}</div>
                <div className="text-xs text-mut mt-0.5">Next: pick a head coach, then draft your XI.</div>
              </div>
            </div>
            <Btn full className="mt-4" onClick={() => dispatch({ type: "CHOOSE_CLUB", clubId: club.id })}>
              Take charge
            </Btn>
          </Panel>
        </div>
      )}
    </div>
  );
}
