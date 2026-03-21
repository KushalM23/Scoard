import type { SeasonType, TeamRange, TeamTab } from "@/app/types/team";

export const CURRENT_SEASON = "2025-26";

export const TEAM_META: Record<
  number,
  { city: string; name: string; tricode: string }
> = {
  1610612737: { city: "Atlanta", name: "Hawks", tricode: "ATL" },
  1610612738: { city: "Boston", name: "Celtics", tricode: "BOS" },
  1610612751: { city: "Brooklyn", name: "Nets", tricode: "BKN" },
  1610612766: { city: "Charlotte", name: "Hornets", tricode: "CHA" },
  1610612741: { city: "Chicago", name: "Bulls", tricode: "CHI" },
  1610612739: { city: "Cleveland", name: "Cavaliers", tricode: "CLE" },
  1610612742: { city: "Dallas", name: "Mavericks", tricode: "DAL" },
  1610612743: { city: "Denver", name: "Nuggets", tricode: "DEN" },
  1610612765: { city: "Detroit", name: "Pistons", tricode: "DET" },
  1610612744: { city: "Golden State", name: "Warriors", tricode: "GSW" },
  1610612745: { city: "Houston", name: "Rockets", tricode: "HOU" },
  1610612754: { city: "Indiana", name: "Pacers", tricode: "IND" },
  1610612746: { city: "LA", name: "Clippers", tricode: "LAC" },
  1610612747: { city: "Los Angeles", name: "Lakers", tricode: "LAL" },
  1610612763: { city: "Memphis", name: "Grizzlies", tricode: "MEM" },
  1610612748: { city: "Miami", name: "Heat", tricode: "MIA" },
  1610612749: { city: "Milwaukee", name: "Bucks", tricode: "MIL" },
  1610612750: { city: "Minnesota", name: "Timberwolves", tricode: "MIN" },
  1610612740: { city: "New Orleans", name: "Pelicans", tricode: "NOP" },
  1610612752: { city: "New York", name: "Knicks", tricode: "NYK" },
  1610612760: { city: "Oklahoma City", name: "Thunder", tricode: "OKC" },
  1610612753: { city: "Orlando", name: "Magic", tricode: "ORL" },
  1610612755: { city: "Philadelphia", name: "76ers", tricode: "PHI" },
  1610612756: { city: "Phoenix", name: "Suns", tricode: "PHX" },
  1610612757: { city: "Portland", name: "Trail Blazers", tricode: "POR" },
  1610612758: { city: "Sacramento", name: "Kings", tricode: "SAC" },
  1610612759: { city: "San Antonio", name: "Spurs", tricode: "SAS" },
  1610612761: { city: "Toronto", name: "Raptors", tricode: "TOR" },
  1610612762: { city: "Utah", name: "Jazz", tricode: "UTA" },
  1610612764: { city: "Washington", name: "Wizards", tricode: "WAS" },
};

export const TEAM_TABS: TeamTab[] = ["team-stats", "player-stats", "roster"];
export const TEAM_RANGES: TeamRange[] = [5, 10, 15];

export function isValidTeamId(teamId: number): boolean {
  return Object.prototype.hasOwnProperty.call(TEAM_META, teamId);
}

export function parseTeamId(raw: string): number | null {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || !isValidTeamId(parsed)) {
    return null;
  }
  return parsed;
}

export function parseSeasonType(raw: string | null): SeasonType {
  return "Regular Season";
}

export function parseTab(raw: string | null): TeamTab {
  return TEAM_TABS.includes(raw as TeamTab) ? (raw as TeamTab) : "team-stats";
}

export function parseRange(raw: string | null): TeamRange {
  const parsed = Number(raw);
  return TEAM_RANGES.includes(parsed as TeamRange) ? (parsed as TeamRange) : 10;
}
