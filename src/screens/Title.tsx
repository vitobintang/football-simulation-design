"use client";

import { useState } from "react";
import { Btn } from "@/components/ui";
import { useGame } from "@/lib/state";

export default function TitleScreen() {
  const { dispatch } = useGame();
  const [name, setName] = useState("");

  return (
    <div className="min-h-dvh flex flex-col justify-between px-6 py-10 pitch-lines">
      <div />
      <div className="fade-up lg:max-w-[560px] lg:mx-auto">
        <div className="display text-[13px] tracking-[0.3em] text-turf font-semibold mb-3">FOOTBALL SIMULATION</div>
        <h1 className="display font-bold uppercase leading-[0.95] text-[64px] text-chalk">
          Pitch
          <br />
          <span className="text-turf">Lords</span>
        </h1>
        <p className="text-mut mt-4 text-[15px] leading-snug max-w-[300px]">
          One league. One cup. Draft your XI under a budget cap, out-think rival coaches and take your club to glory.
        </p>

        <div className="mt-10 space-y-3">
          <label className="block">
            <span className="display text-[11px] uppercase tracking-[0.14em] text-dim font-semibold">Manager name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={20}
              className="mt-1.5 w-full bg-bg1 border border-line rounded-lg px-4 py-3 text-[15px] outline-none focus:border-turf placeholder:text-dim"
            />
          </label>
          <Btn full disabled={name.trim().length < 2} onClick={() => dispatch({ type: "NEW_GAME", manager: name.trim() })}>
            Start new career
          </Btn>
        </div>
      </div>

      <div className="text-dim text-xs text-center display uppercase tracking-[0.18em]">12 clubs · 26 weeks · 1 throne</div>
    </div>
  );
}
