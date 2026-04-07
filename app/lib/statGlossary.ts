const STAT_GLOSSARY: Record<string, string> = {
  GP: "Games Played",
  W: "Wins",
  L: "Losses",
  WL: "Win/Loss Result",
  MIN: "Minutes",
  PTS: "Points",
  REB: "Rebounds",
  AST: "Assists",
  STL: "Steals",
  BLK: "Blocks",
  TO: "Turnovers",
  TOV: "Turnovers",
  PF: "Personal Fouls",
  FGM: "Field Goals Made",
  FGA: "Field Goals Attempted",
  FG: "Field Goals (Made/Attempted)",
  "FG%": "Field Goal Percentage",
  "3PT": "Three-Point Field Goals (Made/Attempted)",
  "3PM": "Three-Point Field Goals Made",
  "3PA": "Three-Point Field Goals Attempted",
  "3P%": "Three-Point Percentage",
  FTM: "Free Throws Made",
  FTA: "Free Throws Attempted",
  FT: "Free Throws (Made/Attempted)",
  "FT%": "Free Throw Percentage",
  OREB: "Offensive Rebounds",
  DREB: "Defensive Rebounds",
  "+/-": "Plus Minus",
  PPG: "Points Per Game",
  RPG: "Rebounds Per Game",
  APG: "Assists Per Game",
  BPG: "Blocks Per Game",
  SPG: "Steals Per Game",
  ORPG: "Offensive Rebounds Per Game",
  DRPG: "Defensive Rebounds Per Game",
  "NET RTG": "Net Rating",
  NETRTG: "Net Rating",
  ORTG: "Offensive Rating",
  DRTG: "Defensive Rating",
  PACE: "Pace",
  "EFG%": "Effective Field Goal Percentage",
  "DRB%": "Defensive Rebound Percentage",
  "ORB%": "Offensive Rebound Percentage",
  "TOV%": "Turnover Percentage",
  PCT: "Win Percentage",
  GB: "Games Behind",
  L10: "Last 10 Games",
  STRK: "Streak",
  OPPG: "Opponent Points Per Game",
  HOME: "Home Record",
  ROAD: "Road Record",
  "AST%": "Assist Percentage",
  "REB%": "Rebound Percentage",
  PIE: "Player Impact Estimate",
  "PTS OFF TURNOVERS": "Points Off Turnovers",
  "FAST BREAK PTS": "Fast Break Points",
};

function normalizeStatLabel(label: string): string {
  return label.replace(/\s+/g, " ").trim();
}

export function getStatDescription(label: string): string | null {
  const normalizedLabel = normalizeStatLabel(label);
  if (!normalizedLabel) return null;

  const upperLabel = normalizedLabel.toUpperCase();
  const directMatch =
    STAT_GLOSSARY[normalizedLabel] ?? STAT_GLOSSARY[upperLabel];

  if (directMatch) return directMatch;

  if (upperLabel.startsWith("OPP ")) {
    const baseLabel = normalizedLabel.slice(4);
    const baseDescription = getStatDescription(baseLabel);
    if (baseDescription) {
      return baseDescription.startsWith("Opponent ")
        ? baseDescription
        : `Opponent ${baseDescription}`;
    }
  }

  return null;
}
