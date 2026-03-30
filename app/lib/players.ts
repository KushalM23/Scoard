import type { PlayerTab } from "@/app/types/player";

export const PLAYER_TABS: PlayerTab[] = ["overview", "stats", "game-log"];

export function parsePlayerId(raw: string): number | null {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function parsePlayerTab(raw: string | null): PlayerTab {
  return PLAYER_TABS.includes(raw as PlayerTab)
    ? (raw as PlayerTab)
    : "overview";
}
