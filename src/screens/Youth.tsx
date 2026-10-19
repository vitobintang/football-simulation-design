"use client";

import { useState } from "react";
import { Btn, Ovr, Panel, PlayerCard, PosTag } from "@/components/ui";
import { GROWTH_LABEL, GROUP_LABEL, POS_GROUP, sameLine } from "@/lib/data";
import { ovr } from "@/lib/gen";
import { clubById } from "@/lib/season";
import { useGame } from "@/lib/state";
import type { Player } from "@/lib/types";

export default function YouthScreen() {
  const { state, dispatch } = useGame();
  const [selected, setSelected] = useState<string | null>(null);
  const [pendingReplace, setPendingReplace] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const club = clubById(state, state.userClubId);
  const offer = state.youth ?? [];
  const prospect = offer.find((p) => p.id === selected) ?? null;
  const pendingPlayer = pendingReplace ? club.players.find((p) => p.id === pendingReplace) ?? null : null;
  const openPlayer = openId ? [...offer, ...club.players].find((p) => p.id === openId) ?? null : null;

  const pickProspect = (id: string) => {
    setSelected(selected === id ? null : id);
    setPendingReplace(null);
  };

  const confirmSwap = () => {
    if (!prospect || !pendingReplace) return;
    dispatch({ type: "SWAP_YOUTH", prospectId: prospect.id, replaceId: pendingReplace });
    setSelected(null);
    setPendingReplace(null);
  };

  return (
    <div className="min-h-dvh flex flex-col px-5 pt-8 pb-6 lg:max-w-[820px] lg:mx-auto lg:w-full">
      <div className="display text-[12px] uppercase tracking-[0.3em] text-turf font-semibold">Off-season · Academy draft</div>
      <h2 className="display uppercase text-3xl font-bold text-chalk mt-1 leading-tight">Four kids knock</h2>
      <p className="text-mut text-sm mt-2">
        Four academy prospects — sometimes raw kids, sometimes 80-ovr wonderkids. Pick one, choose who he replaces, then confirm. Take all four, two, one, or skip. Veterans retire; empty seats get filled with academy kids.
      </p>

      <div className="flex-1 mt-5 space-y-2 overflow-y-auto pb-4">
        {offer.map((p) => (
          <div
            key={p.id}
            className={`w-full flex items-center gap-3 rounded-xl border px-3 py-3 ${selected === p.id ? "bg-turfdark border-turf" : "bg-bg1 border-line"}`}
          >
            <button onClick={() => pickProspect(p.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
              <Ovr v={ovr(p)} />
              <span className="flex-1 min-w-0">
                <span className="text-[14px] text-chalk font-semibold block truncate">
                  {p.name} {ovr(p) >= 78 && <span className="text-gold">◆ wonderkid</span>}
                </span>
                <span className="text-[11px] text-mut">
                  {p.nat} · {p.age}y · {GROWTH_LABEL[p.growth]} · pot <span className={`num ${p.pot >= 88 ? "text-gold" : "text-turf"}`}>{p.pot}</span>
                </span>
              </span>
            </button>
            <PosTag pos={p.pos} />
            <button
              onClick={() => setOpenId(p.id)}
              className="display text-[10px] uppercase font-bold text-mut border border-line rounded-md px-2 py-1.5"
            >
              Card
            </button>
          </div>
        ))}
        {offer.length === 0 && (
          <Panel className="p-4 text-sm text-mut">You&apos;ve taken everyone on offer. The academy waves goodbye.</Panel>
        )}
      </div>

      {prospect && (
        <div className="fade-up">
          <Panel className="p-3 mb-3 border-turf/40">
            <div className="text-[12px] text-turf display uppercase font-semibold tracking-wide mb-2">
              Who does {prospect.name.split(" ")[1]} replace? Pick one of your {GROUP_LABEL[POS_GROUP[prospect.pos]]}…
            </div>
            {club.players.some((p) => sameLine(p.pos, prospect.pos)) ? (
              <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto">
                {club.players
                  .filter((p) => sameLine(p.pos, prospect.pos))
                  .map((p) => (
                    <div
                      key={p.id}
                      className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
                        pendingReplace === p.id ? "bg-turfdark border-turf" : "bg-bg2 border-line"
                      }`}
                    >
                      <button onClick={() => setPendingReplace(pendingReplace === p.id ? null : p.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                        <PosTag pos={p.pos} />
                        <span className="text-[12px] text-ink truncate flex-1">{p.name.split(" ")[1] ?? p.name}</span>
                        <span className="num text-[10px] text-dim">{ovr(p)}</span>
                      </button>
                      <button onClick={() => setOpenId(p.id)} className="text-dim text-[10px] font-bold border border-line rounded px-1.5 py-1">
                        ⓘ
                      </button>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-[12px] text-dim">
                You have no {GROUP_LABEL[POS_GROUP[prospect.pos]]} to swap — this kid can&apos;t join. Pick another prospect.
              </div>
            )}

            {pendingPlayer && (
              <div className="mt-3 pt-3 border-t border-line">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-ink">
                    <span className="text-turf font-semibold">{prospect.name}</span> in
                  </span>
                  <span className="display text-gold text-[11px]">⇄</span>
                  <span className="text-ink">
                    <span className="text-clay font-semibold">{pendingPlayer.name}</span> out
                  </span>
                </div>
                <div className="flex gap-2 mt-3">
                  <Btn variant="ghost" className="flex-1" onClick={() => setPendingReplace(null)}>
                    Back
                  </Btn>
                  <Btn variant="primary" className="flex-[2]" onClick={confirmSwap}>
                    Confirm swap
                  </Btn>
                </div>
              </div>
            )}
            <div className="text-[10px] text-dim mt-2">Academy rules: same line only (e.g. a WM prospect can replace a CM). Nothing happens until you confirm.</div>
          </Panel>
        </div>
      )}

      <div className="flex gap-2">
        {selected && (
          <Btn
            variant="ghost"
            className="flex-1"
            onClick={() => {
              setSelected(null);
              setPendingReplace(null);
            }}
          >
            Cancel
          </Btn>
        )}
        <Btn full={!!selected} variant="gold" className={selected ? "flex-[2]" : ""} onClick={() => dispatch({ type: "FINISH_SEASON" })}>
          {offer.length === 4 ? "Skip draft · start season" : `Start season ${state.season + 1}`}
        </Btn>
      </div>

      {openPlayer && (
        <PlayerCard
          p={openPlayer}
          ovr={ovr(openPlayer)}
          onClose={() => setOpenId(null)}
          footer={
            prospect && club.players.some((p) => p.id === openPlayer.id && sameLine(p.pos, prospect.pos)) ? (
              <Btn
                full
                variant="primary"
                onClick={() => {
                  setPendingReplace(openPlayer.id);
                  setOpenId(null);
                }}
              >
                Select for the swap
              </Btn>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
