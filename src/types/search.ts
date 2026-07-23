export type SearchEntityType = "player" | "team";

export interface SearchPlayerRecord {
  id: number;
  type: "player";
  firstName: string;
  lastName: string;
  displayName: string;
  displayLastCommaFirst: string;
  teamId: number;
  teamName: string;
  teamTricode: string;
  headshotUrl: string;
}

export interface SearchTeamRecord {
  id: number;
  type: "team";
  city: string;
  name: string;
  displayName: string;
  logoUrl: string;
}

export interface SearchBootstrapPayload {
  season: string;
  players: SearchPlayerRecord[];
  teams: SearchTeamRecord[];
}

export type SearchMatchMode = "exact-prefix" | "typo-prefix";

export type SearchMatchField =
  | "team-name"
  | "team-city"
  | "player-last"
  | "player-first";

export interface SearchMatchMetadata {
  mode: SearchMatchMode;
  field: SearchMatchField;
  editDistance: number;
  tokenLength: number;
}

export interface SearchSuggestion {
  id: number;
  type: SearchEntityType;
  displayName: string;
  subLabel: string;
  imageUrl: string;
  href: string;
  metadata?: SearchMatchMetadata;
}
