import type {
  SearchEntityType,
  SearchMatchField,
  SearchMatchMetadata,
  SearchMatchMode,
} from "@/app/types/search";

interface RankedCandidate {
  metadata: SearchMatchMetadata;
  type: SearchEntityType;
  sortName: string;
  displayName: string;
}

const MATCH_TIER: Record<`${SearchMatchMode}:${SearchMatchField}`, number> = {
  "exact-prefix:team-name": 0,
  "exact-prefix:team-city": 1,
  "exact-prefix:player-last": 2,
  "exact-prefix:player-first": 3,
  "typo-prefix:team-name": 4,
  "typo-prefix:team-city": 5,
  "typo-prefix:player-last": 6,
  "typo-prefix:player-first": 7,
};

function getTier(metadata: SearchMatchMetadata): number {
  return MATCH_TIER[`${metadata.mode}:${metadata.field}`];
}

export function scoreSuggestion(metadata: SearchMatchMetadata): number {
  const tier = getTier(metadata);
  return (
    tier * 100000 + metadata.editDistance * 1000 + metadata.tokenLength * 10
  );
}

export function compareMatchMetadata(
  a: SearchMatchMetadata,
  b: SearchMatchMetadata,
): number {
  const aTier = getTier(a);
  const bTier = getTier(b);

  if (aTier !== bTier) {
    return aTier - bTier;
  }

  if (a.editDistance !== b.editDistance) {
    return a.editDistance - b.editDistance;
  }

  if (a.tokenLength !== b.tokenLength) {
    return a.tokenLength - b.tokenLength;
  }

  return 0;
}

export function compareSuggestions(
  a: RankedCandidate,
  b: RankedCandidate,
): number {
  const metadataComparison = compareMatchMetadata(a.metadata, b.metadata);
  if (metadataComparison !== 0) {
    return metadataComparison;
  }

  if (a.type !== b.type) {
    return a.type === "team" ? -1 : 1;
  }

  const bySortName = a.sortName.localeCompare(b.sortName);
  if (bySortName !== 0) {
    return bySortName;
  }

  return a.displayName.localeCompare(b.displayName);
}
