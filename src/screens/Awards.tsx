"use client";

import { Btn, Crest, Panel, SectionLabel } from "@/components/ui";
import { ClubLink, PlayerLink } from "@/lib/overlay";
import { clubById, standings } from "@/lib/season";
import { useGame } from "@/lib/state";
import type { AwardEntry } from "@/lib/types";

export default function AwardsScreen() {
  const { state, dispatch } = useGame();
  const s = state.summary;
  if (!s) return null;
  const champ = clubById(state, s.champId);
  const cupWinner = clubById(state, s.cupWinnerId);
  const user = clubById(state, state.userClubId);
  const table = standings(state).slice(0, 5);
  const youWonLeague = s.champId === state.userClubId;
  const youWonCup = s.cupWinnerId === state.userClubId;

  const managerMine = !!s.manager && (s.manager.isUser || s.manager.clubId === state.userClubId);
  const awards: { label: string; entry: AwardEntry | null; unit: string }[] = [
    { label: "Player of the Season (MVP)", entry: s.mvpSeason, unit: "avg rating" },
    { label: "League Player (MVP)", entry: s.mvpLeague, unit: "avg rating" },
    { label: "Cup Player (MVP)", entry: s.mvpCup, unit: "avg rating" },
    { label: "Golden Boot", entry: s.boot, unit: "goals" },
    { label: "Playmaker of the Season", entry: s.assists, unit: "assists" },
    { label: "Most MOTM · League", entry: s.mots, unit: "MOTM" },
    { label: "Most MOTM · Cup", entry: s.motc, unit: "MOTM" },
    { label: "Best Young Player", entry: s.young, unit: "avg rating" },
    { label: "Golden Glove", entry: s.glove, unit: "pts" },
  ];

  return (
    <div className="min-h-dvh flex flex-col px-5 pt-10 pb-8 pitch-lines lg:max-w-[880px] lg:mx-auto lg:w-full">
      <div className="text-center fade-up">
        <div className="display text-[12px] uppercase tracking-[0.3em] text-turf font-semibold">Season {s.season} complete</div>
        <h2 className="display uppercase text-4xl font-bold text-chalk mt-2 leading-tight">
          {youWonLeague ? "Champions!" : "Season awards"}
        </h2>
        {youWonLeague && <div className="text-gold display uppercase text-sm tracking-widest mt-1">You won the league ★</div>}
        {youWonCup && <div className="text-gold display uppercase text-sm tracking-widest mt-1">Cup winners ★</div>}
      </div>

      <div className="flex-1 mt-8 space-y-3 overflow-y-auto pb-4">
        <Panel className="p-4 flex items-center gap-4">
          <Trophy color="#E4B54E" />
          <div className="flex-1">
            <SectionLabel>League champions</SectionLabel>
            <div className="flex items-center gap-2.5">
              <Crest colors={champ.colors} variant={champ.crest} size={30} />
              <ClubLink clubId={champ.id} name={champ.name} className="display uppercase font-bold text-chalk text-[16px]" />
            </div>
          </div>
        </Panel>

        <Panel className="p-4 flex items-center gap-4">
          <Trophy color="#9AA79C" />
          <div className="flex-1">
            <SectionLabel>Domestic cup</SectionLabel>
            <div className="flex items-center gap-2.5">
              <Crest colors={cupWinner.colors} variant={cupWinner.crest} size={30} />
              <ClubLink clubId={cupWinner.id} name={cupWinner.name} className="display uppercase font-bold text-chalk text-[16px]" />
            </div>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionLabel>Manager of the season</SectionLabel>
          {s.manager ? (
            <div className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${managerMine ? "bg-turfdark border border-turf/40" : "bg-bg2 border border-line"}`}>
              <span className="text-2xl">🎖️</span>
              <span className="flex-1">
                <span className={`display uppercase font-bold text-[15px] block ${managerMine ? "text-turf" : "text-chalk"}`}>
                  {s.manager.name} {managerMine && <span className="text-gold">★ You</span>}
                </span>
                <span className="text-[11px] text-mut">
                  <ClubLink clubId={s.manager.clubId} name={clubById(state, s.manager.clubId)?.name ?? ""} className="text-mut" />
                  {" — judged on league points + cup run"}
                </span>
              </span>
            </div>
          ) : (
            <div className="text-xs text-dim">No winner.</div>
          )}
        </Panel>

        <Panel className="p-4">
          <SectionLabel>Individual honours</SectionLabel>
          <div className="space-y-1.5">
            {awards.map((a) => {
              const mine = !!a.entry && a.entry.clubId === state.userClubId;
              const star = mine && a.entry?.playerId === state.youId;
              return (
                <div key={a.label} className={`flex items-center text-[13px] rounded-lg px-2 -mx-2 py-1.5 ${mine ? "bg-turfdark" : ""}`}>
                  <span className="flex-1 text-mut">
                    {a.label}
                    {star && <span className="display ml-1.5 text-[8px] uppercase tracking-wider text-gold border border-gold/40 rounded px-1 py-0.5">★ Your star</span>}
                    {mine && !star && <span className="display ml-1.5 text-[8px] uppercase tracking-wider text-turf border border-turf/40 rounded px-1 py-0.5">Your player</span>}
                  </span>
                  {a.entry ? (
                    <>
                      <span className="mr-2 max-w-[130px] truncate">
                        <PlayerLink playerId={a.entry.playerId} name={a.entry.name} className={star ? "text-gold font-semibold" : mine ? "text-turf font-semibold" : "text-chalk font-semibold"} />
                      </span>
                      <span className="text-[10px] text-dim mr-2">
                        <ClubLink clubId={a.entry.clubId} name={clubById(state, a.entry.clubId)?.short ?? ""} className="text-dim" />
                      </span>
                      <span className="num text-gold font-bold">
                        {Math.round(a.entry.value * 10) / 10} <span className="text-[9px] text-dim font-normal">{a.unit}</span>
                      </span>
                    </>
                  ) : (
                    <span className="text-dim text-xs">no winner</span>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionLabel>Your finish</SectionLabel>
          <div className="flex items-center gap-3">
            <Crest colors={user.colors} variant={user.crest} size={30} />
            <span className="flex-1 display uppercase font-bold text-chalk">{user.name}</span>
            <span className="display num text-2xl font-bold text-turf">
              {s.userPos}<span className="text-dim text-sm">/{state.clubs.length}</span>
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-line flex items-center justify-between">
            <span className="text-[12px] text-mut">Domestic Cup</span>
            <span
              className={`display uppercase text-[12px] font-bold tracking-wide ${
                s.cupRun.includes("CHAMPIONS") ? "text-gold" : s.cupRun.includes("runners") ? "text-chalk" : "text-mut"
              }`}
            >
              {s.cupRun}
            </span>
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionLabel>Final table — top five</SectionLabel>
          <div className="space-y-1.5">
            {table.map((r, i) => {
              const c = clubById(state, r.clubId);
              return (
                <div key={r.clubId} className="flex items-center text-[13px]">
                  <span className={`num w-6 ${i === 0 ? "text-gold" : "text-dim"}`}>{i + 1}.</span>
                  <span className={`flex-1 truncate ${c.id === state.userClubId ? "text-turf font-semibold" : "text-ink"}`}>{c.name}</span>
                  <span className="num text-mut">{r.pts} pts</span>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="space-y-2">
        <Btn full variant="gold" onClick={() => dispatch({ type: "GO_YOUTH" })}>
          Continue to academy draft
        </Btn>
        <div className="text-center text-[11px] text-dim">
          Players develop by hidden potential, age and retire. Youth prospects await.
        </div>
      </div>
    </div>
  );
}

function Trophy({ color }: { color: string }) {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24">
      <path
        fill={color}
        d="M6 3h12v3a6 6 0 0 1-4.5 5.8V15h2.5v2h2v2h-12v-2h2v-2H10v-3.2A6 6 0 0 1 6 6V3zm-3 2h3v3a3 3 0 0 1-3-3zm18 0h-3v3a3 3 0 0 0 3-3z"
      />
    </svg>
  );
}
