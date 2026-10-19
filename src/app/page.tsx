"use client";

import { OverlayProvider } from "@/lib/overlay";
import { GameProvider, useGame } from "@/lib/state";
import AwardsScreen from "@/screens/Awards";
import ClubSelectScreen from "@/screens/ClubSelect";
import CoachSelectScreen from "@/screens/CoachSelect";
import HubScreen, { isCupWeek } from "@/screens/Hub";
import MatchScreen from "@/screens/Match";
import SquadBuildScreen from "@/screens/SquadBuild";
import TitleScreen from "@/screens/Title";
import YouthScreen from "@/screens/Youth";

const PHASES = new Set(["title", "club", "coach", "squad", "hub", "match", "awards", "youth"]);

function Shell() {
  const { state } = useGame();
  const phase = PHASES.has(state.phase) ? state.phase : "title";
  const cupTheme =
    (phase === "hub" || phase === "match") &&
    state.weekIdx < state.calendar.length &&
    isCupWeek(state);
  return (
    <div className={`mx-auto max-w-[480px] lg:max-w-[1180px] min-h-dvh bg-bg0 text-ink border-x border-line/50 ${cupTheme ? "cup-theme" : ""}`}>
      {phase === "title" && <TitleScreen />}
      {phase === "club" && <ClubSelectScreen />}
      {phase === "coach" && <CoachSelectScreen />}
      {phase === "squad" && <SquadBuildScreen />}
      {phase === "hub" && <HubScreen />}
      {phase === "match" && <MatchScreen />}
      {phase === "awards" && <AwardsScreen />}
      {phase === "youth" && <YouthScreen />}
    </div>
  );
}

export default function Page() {
  return (
    <GameProvider>
      <OverlayProvider>
        <Shell />
      </OverlayProvider>
    </GameProvider>
  );
}
