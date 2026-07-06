import type { SeasonType, TeamRange, TeamTab } from "@/app/types/team";
import { parseSeasonType as parseNbaSeasonType } from "@/app/lib/postseason";

export const CURRENT_SEASON = "2025-26";
const SEASON_ID_PATTERN = /^\d{4}-\d{2}$/;
const MIN_SEASON_START_YEAR = 1996;

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
  return parseNbaSeasonType(raw);
}

export function parseSeasonStart(seasonId: string): number {
  const [start] = seasonId.split("-");
  return Number(start);
}

export function formatSeasonId(startYear: number): string {
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

export function isValidSeasonId(seasonId: string): boolean {
  if (!SEASON_ID_PATTERN.test(seasonId)) {
    return false;
  }

  const startYear = parseSeasonStart(seasonId);
  if (!Number.isInteger(startYear)) {
    return false;
  }

  const expectedSuffix = String((startYear + 1) % 100).padStart(2, "0");
  const [, suffix] = seasonId.split("-");

  return suffix === expectedSuffix;
}

export function parseSeason(raw: string | null): string {
  if (!raw || !isValidSeasonId(raw)) {
    return CURRENT_SEASON;
  }

  const startYear = parseSeasonStart(raw);
  const currentStartYear = parseSeasonStart(CURRENT_SEASON);

  if (startYear < MIN_SEASON_START_YEAR || startYear > currentStartYear) {
    return CURRENT_SEASON;
  }

  return raw;
}

export function getTeamSeasonOptions(
  selectedSeason = CURRENT_SEASON,
  limit?: number,
): string[] {
  const currentStartYear = parseSeasonStart(CURRENT_SEASON);
  const selectedStartYear = parseSeasonStart(selectedSeason);
  const oldestStartYear = Math.min(
    MIN_SEASON_START_YEAR,
    Number.isInteger(selectedStartYear) ? selectedStartYear : currentStartYear,
  );

  const seasons: string[] = [];
  for (let startYear = currentStartYear; startYear >= oldestStartYear; startYear -= 1) {
    seasons.push(formatSeasonId(startYear));
  }

  if (!seasons.includes(selectedSeason) && isValidSeasonId(selectedSeason)) {
    seasons.push(selectedSeason);
  }

  const sorted = seasons.sort(
    (a, b) => parseSeasonStart(b) - parseSeasonStart(a),
  );

  if (sorted.includes(selectedSeason)) {
    const withSelectedFirst = [
      selectedSeason,
      ...sorted.filter((season) => season !== selectedSeason),
    ];
    return typeof limit === "number"
      ? withSelectedFirst.slice(0, limit)
      : withSelectedFirst;
  }

  return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
}

export function parseTab(raw: string | null): TeamTab {
  return TEAM_TABS.includes(raw as TeamTab) ? (raw as TeamTab) : "team-stats";
}

export function parseRange(raw: string | null): TeamRange {
  const parsed = Number(raw);
  return TEAM_RANGES.includes(parsed as TeamRange) ? (parsed as TeamRange) : 10;
}

export function getSeasonFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed: 0 = Jan, 9 = Oct
  const startYear = month >= 9 ? year : year - 1;
  return formatSeasonId(startYear);
}

export function shiftDateToSeason(date: Date, targetSeason: string): Date {
  const targetStartYear = parseSeasonStart(targetSeason);
  const month = date.getMonth();
  const day = date.getDate();
  const targetYear = month >= 9 ? targetStartYear : targetStartYear + 1;
  // Handle Feb 29 leap years safely
  const targetDate = new Date(targetYear, month, day);
  if (targetDate.getMonth() !== month) {
    return new Date(targetYear, month, day - 1);
  }
  return targetDate;
}
