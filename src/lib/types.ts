export type Pos = "GK" | "CB" | "FB" | "CM" | "WM" | "WF" | "ST";

export type PlayStyleId = "possession" | "wing" | "press" | "counter" | "longball" | "lowblock";

export type FormationId = "4-4-2" | "4-3-3" | "4-2-3-1" | "3-5-2" | "5-3-2" | "3-4-3";

export type GrowthType = "early" | "mid" | "late" | "wonder" | "eternal" | "unique";

export type Mentality = "def" | "bal" | "att";

export type Phase = "title" | "club" | "coach" | "squad" | "hub" | "match" | "awards" | "youth";

export type HubTab = "home" | "league" | "cup" | "tactics" | "trade" | "stats" | "feed";

export interface Ab {
  a: number;
  d: number;
  p: number;
  dr: number;
  pa: number;
  v: number;
  s: number;
  ph: number;
}

export interface GkAb {
  dive: number;
  pass: number;
  reflex: number;
  phys: number;
}

export interface Player {
  id: string;
  name: string;
  age: number;
  pos: Pos;
  nat: string;
  ab: Ab;
  gk?: GkAb;
  value: number;
  /** hidden */
  pot: number;
  /** hidden */
  growth: GrowthType;
  wonderDone?: boolean;
  /** additional positions learned / naturally comfortable */
  pos2?: Pos;
  pos3?: Pos;
  /** learning progress 0-100 for positions played out of role */
  learn: Partial<Record<Pos, number>>;
  /** ovr trajectory, one entry per season */
  hist: number[];
  /** season the player joined the league (for Best Young award) */
  rookieSeason?: number;
  /** full career log, appended each season */
  career?: CareerLine[];
}

export interface CareerLine {
  season: number;
  clubId: string;
  clubShort: string;
  apps: number;
  goals: number;
  assists: number;
  avg: number;
}

export interface Coach {
  id: string;
  name: string;
  style: PlayStyleId;
  formation: FormationId;
}

export interface Club {
  id: string;
  name: string;
  short: string;
  colors: [string, string];
  crest: number;
  tier: number;
  style: PlayStyleId;
  formation: FormationId;
  coach: Coach;
  players: Player[];
  morale: number;
  isUser?: boolean;
  lower?: boolean;
}

export interface Fixture {
  home: string;
  away: string;
  played: boolean;
  hg: number;
  ag: number;
}

export interface CupTie {
  home: string;
  away: string;
  played: boolean;
  hg: number;
  ag: number;
  winner: string;
  pens: [number, number] | null;
}

export interface CupRound {
  name: string;
  short: string;
  ties: CupTie[];
}

export type Week = { kind: "league"; round: number } | { kind: "cup"; cupRound: number };

export interface Comment {
  id: string;
  handle: string;
  text: string;
  likes: number;
}

export interface Post {
  id: string;
  week: number;
  handle: string;
  text: string;
  likes: number;
  rps: number;
  kind: "match" | "trade" | "rumor" | "coach" | "beef" | "hype" | "system";
  comments: Comment[];
}

export interface ScorerTrack {
  name: string;
  clubId: string;
  goals: number;
}

export interface MatchRecord {
  wk: number;
  comp: "L" | "C";
  home: string;
  away: string;
  hg: number;
  ag: number;
  pens?: [number, number] | null;
}

export interface EngineEvent {
  min: number;
  type: "kick" | "goal" | "save" | "wide" | "block" | "card" | "inj" | "tackle" | "ht" | "ft" | "pen" | "info";
  side: 0 | 1 | -1;
  text: string;
}

export interface GoalEntry {
  playerId: string;
  name: string;
  clubId: string;
  side: 0 | 1;
  min: number;
}

/** per-match per-player performance line */
export interface PerfLine {
  goals: number;
  assists: number;
  saves: number;
  tackles: number;
  twon: number;
  passes: number;
  psucc: number;
  yel: number;
  red: number;
  rating: number;
}

/** season-long aggregate per player */
export interface PlayerStats {
  name: string;
  clubId: string;
  pos: Pos;
  age: number;
  apps: number;
  appsL: number;
  appsC: number;
  goals: number;
  assists: number;
  motm: number;
  motmL: number;
  motmC: number;
  yel: number;
  red: number;
  saves: number;
  tackles: number;
  twon: number;
  passes: number;
  psucc: number;
  clean: number;
  rsum: number;
  rsumL: number;
  rsumC: number;
}

export interface TradeRecord {
  wk: number;
  aId: string;
  aName: string;
  bId: string;
  bName: string;
  pa: string;
  paId: string;
  pb: string;
  pbId: string;
}

export interface AwardEntry {
  name: string;
  clubId: string;
  playerId?: string;
  value: number;
}

export interface SeasonSummary {
  season: number;
  champId: string;
  champName: string;
  cupWinnerId: string;
  cupWinnerName: string;
  userPos: number;
  cupRun: string;
  manager: { name: string; clubId: string; isUser: boolean } | null;
  boot: AwardEntry | null;
  assists: AwardEntry | null;
  mots: AwardEntry | null;
  motc: AwardEntry | null;
  mvpSeason: AwardEntry | null;
  mvpLeague: AwardEntry | null;
  mvpCup: AwardEntry | null;
  young: AwardEntry | null;
  glove: AwardEntry | null;
}

/** full post-match report, stored for the user's matches so they can be reviewed later */
export interface ReportSide {
  id: string;
  name: string;
  short: string;
  colors: [string, string];
  crest: number;
}

export interface ReportLine {
  side: 0 | 1;
  playerId: string;
  name: string;
  pos: Pos;
  rating: number;
  goals: number;
  assists: number;
  saves: number;
  tackles: number;
  twon: number;
  yel: number;
  red: number;
  passes: number;
  psucc: number;
}

export interface ReportStats {
  pos: number;
  sh: number;
  sot: number;
  sv: number;
  ck: number;
}

export interface MatchReport {
  wk: number;
  comp: "L" | "C";
  home: ReportSide;
  away: ReportSide;
  hg: number;
  ag: number;
  pens: [number, number] | null;
  stats: [ReportStats, ReportStats];
  lines: ReportLine[];
  goals: GoalEntry[];
  motm: { playerId: string; name: string; clubId: string; rating: number } | null;
}

export interface CareerSeason {
  season: number;
  pos: number;
  cupRun: string;
  w: number;
  d: number;
  l: number;
  formations: Record<string, number>;
  mentalities: Record<string, number>;
}

export interface GameState {
  v: number;
  season: number;
  manager: string;
  phase: Phase;
  tab: HubTab;
  userClubId: string;
  youId: string;
  budget: number;
  market: Player[];
  signedIds: string[];
  clubs: Club[];
  lower: Club[];
  coachPool: Coach[];
  lineup: (string | null)[];
  rounds: Fixture[][];
  cup: CupRound[];
  calendar: Week[];
  weekIdx: number;
  scorers: Record<string, ScorerTrack>;
  stats: Record<string, PlayerStats>;
  tradeHistory: TradeRecord[];
  history: MatchRecord[];
  cupAlive: boolean;
  summary: SeasonSummary | null;
  posts: Post[];
  tradesLeft: number;
  youth: Player[] | null;
  /** full reports of the user's played matches, keyed by week index */
  reports: Record<string, MatchReport>;
  /** manager career log, one entry per completed season */
  careerHistory: CareerSeason[];
  /** tactics used so far this season */
  seasonTactics: { formations: Record<string, number>; mentalities: Record<string, number> };
  /** transient: when true the match screen fast-forwards instantly */
  autoSim?: boolean;
}
