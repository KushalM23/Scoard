export function getValueFromRow(row: any[], headers: string[], key: string) {
  const index = headers.indexOf(key);
  if (index === -1) return null;
  return row[index] ?? null;
}

export function num(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function pickResultSet(data: any, index = 0) {
  if (!data?.resultSets?.[index]) {
    return { headers: [] as string[], rowSet: [] as any[] };
  }

  return {
    headers: data.resultSets[index].headers ?? [],
    rowSet: data.resultSets[index].rowSet ?? [],
  };
}

export function toRecentForm(l10?: string | null): string[] {
  if (!l10 || typeof l10 !== "string") return [];
  const parts = l10.split("-").map((v) => Number(v.trim()));
  if (parts.length !== 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1]))
    return [];
  return [...Array(parts[0]).fill("W"), ...Array(parts[1]).fill("L")];
}

export function inferHomeAway(matchup?: string | null): "Home" | "Away" {
  return matchup?.includes(" vs. ") ? "Home" : "Away";
}
