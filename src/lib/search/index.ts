import type {
  SearchBootstrapPayload,
  SearchMatchField,
  SearchMatchMetadata,
  SearchMatchMode,
  SearchSuggestion,
} from "@/types/search";
import {
  compactForSearch,
  normalizeForSearch,
  splitSearchTokens,
} from "./normalize";
import { compareMatchMetadata, compareSuggestions } from "./rank";
import { SearchTrie, type TrieHit } from "./trie";

interface SearchIndexEntry {
  id: number;
  type: "player" | "team";
  displayName: string;
  subLabel: string;
  imageUrl: string;
  href: string;
  sortName: string;
}

interface SearchMatch {
  entry: SearchIndexEntry;
  metadata: SearchMatchMetadata;
}

interface SearchTrieSet {
  teamName: SearchTrie;
  teamCity: SearchTrie;
  playerLast: SearchTrie;
  playerFirst: SearchTrie;
  teamNameCompact: SearchTrie;
  teamCityCompact: SearchTrie;
  playerLastCompact: SearchTrie;
  playerFirstCompact: SearchTrie;
}

export interface SearchIndex {
  entries: SearchIndexEntry[];
  tries: SearchTrieSet;
}

const EXACT_PER_TRIE_LIMIT = 1000;
const TYPO_PER_TRIE_LIMIT = 1000;
const DEFAULT_LIMIT = 1000;

function createTrieSet(): SearchTrieSet {
  return {
    teamName: new SearchTrie(),
    teamCity: new SearchTrie(),
    playerLast: new SearchTrie(),
    playerFirst: new SearchTrie(),
    teamNameCompact: new SearchTrie(),
    teamCityCompact: new SearchTrie(),
    playerLastCompact: new SearchTrie(),
    playerFirstCompact: new SearchTrie(),
  };
}

function addFieldTokens(
  trie: SearchTrie,
  compactTrie: SearchTrie,
  rawValue: string,
  ref: number,
): void {
  if (!rawValue) {
    return;
  }

  const normalized = normalizeForSearch(rawValue);
  if (!normalized) {
    return;
  }

  const tokens = new Set<string>([
    normalized,
    ...splitSearchTokens(normalized),
  ]);
  for (const token of tokens) {
    trie.insert(token, ref);
  }

  const compact = compactForSearch(rawValue);
  if (compact) {
    compactTrie.insert(compact, ref);
  }
}

function registerHits(
  hitMap: Map<string, SearchMatch>,
  entries: SearchIndexEntry[],
  hits: TrieHit[],
  mode: SearchMatchMode,
  field: SearchMatchField,
): void {
  for (const hit of hits) {
    const entry = entries[hit.ref];
    if (!entry) {
      continue;
    }

    const key = `${entry.type}:${entry.id}`;
    const metadata: SearchMatchMetadata = {
      mode,
      field,
      editDistance: hit.editDistance,
      tokenLength: hit.tokenLength,
    };

    const previous = hitMap.get(key);
    if (!previous || compareMatchMetadata(metadata, previous.metadata) < 0) {
      hitMap.set(key, { entry, metadata });
    }
  }
}

export function buildSearchIndex(payload: SearchBootstrapPayload): SearchIndex {
  const tries = createTrieSet();
  const entries: SearchIndexEntry[] = [];

  for (const team of payload.teams) {
    const ref = entries.length;
    const sortName = normalizeForSearch(`${team.name} ${team.city}`);

    entries.push({
      id: team.id,
      type: "team",
      displayName: team.displayName,
      subLabel: "Team",
      imageUrl: team.logoUrl,
      href: `/team/${team.id}`,
      sortName,
    });

    addFieldTokens(tries.teamName, tries.teamNameCompact, team.name, ref);
    addFieldTokens(tries.teamCity, tries.teamCityCompact, team.city, ref);
  }

  for (const player of payload.players) {
    const ref = entries.length;
    const sortName = normalizeForSearch(
      `${player.lastName} ${player.firstName}`,
    );

    entries.push({
      id: player.id,
      type: "player",
      displayName: player.displayName,
      subLabel: player.teamName,
      imageUrl: player.headshotUrl,
      href: `/player/${player.id}`,
      sortName,
    });

    addFieldTokens(
      tries.playerLast,
      tries.playerLastCompact,
      player.lastName,
      ref,
    );
    addFieldTokens(
      tries.playerFirst,
      tries.playerFirstCompact,
      player.firstName,
      ref,
    );
  }

  return { entries, tries };
}

export function querySearchIndex(
  index: SearchIndex,
  rawQuery: string,
  limit = DEFAULT_LIMIT,
): SearchSuggestion[] {
  const normalizedQuery = normalizeForSearch(rawQuery);
  if (!normalizedQuery) {
    return [];
  }

  const compactQuery = compactForSearch(rawQuery);
  const matches = new Map<string, SearchMatch>();

  registerHits(
    matches,
    index.entries,
    index.tries.teamName.findPrefix(normalizedQuery, EXACT_PER_TRIE_LIMIT),
    "exact-prefix",
    "team-name",
  );
  registerHits(
    matches,
    index.entries,
    index.tries.teamCity.findPrefix(normalizedQuery, EXACT_PER_TRIE_LIMIT),
    "exact-prefix",
    "team-city",
  );
  registerHits(
    matches,
    index.entries,
    index.tries.playerLast.findPrefix(normalizedQuery, EXACT_PER_TRIE_LIMIT),
    "exact-prefix",
    "player-last",
  );
  registerHits(
    matches,
    index.entries,
    index.tries.playerFirst.findPrefix(normalizedQuery, EXACT_PER_TRIE_LIMIT),
    "exact-prefix",
    "player-first",
  );

  if (compactQuery && compactQuery !== normalizedQuery) {
    registerHits(
      matches,
      index.entries,
      index.tries.teamNameCompact.findPrefix(
        compactQuery,
        EXACT_PER_TRIE_LIMIT,
      ),
      "exact-prefix",
      "team-name",
    );
    registerHits(
      matches,
      index.entries,
      index.tries.teamCityCompact.findPrefix(
        compactQuery,
        EXACT_PER_TRIE_LIMIT,
      ),
      "exact-prefix",
      "team-city",
    );
    registerHits(
      matches,
      index.entries,
      index.tries.playerLastCompact.findPrefix(
        compactQuery,
        EXACT_PER_TRIE_LIMIT,
      ),
      "exact-prefix",
      "player-last",
    );
    registerHits(
      matches,
      index.entries,
      index.tries.playerFirstCompact.findPrefix(
        compactQuery,
        EXACT_PER_TRIE_LIMIT,
      ),
      "exact-prefix",
      "player-first",
    );
  }

  const typoMaxEdits = normalizedQuery.length >= 5 && matches.size < 8 ? 2 : 1;

  registerHits(
    matches,
    index.entries,
    index.tries.teamName.findTypoPrefix(
      normalizedQuery,
      typoMaxEdits,
      TYPO_PER_TRIE_LIMIT,
    ),
    "typo-prefix",
    "team-name",
  );
  registerHits(
    matches,
    index.entries,
    index.tries.teamCity.findTypoPrefix(
      normalizedQuery,
      typoMaxEdits,
      TYPO_PER_TRIE_LIMIT,
    ),
    "typo-prefix",
    "team-city",
  );
  registerHits(
    matches,
    index.entries,
    index.tries.playerLast.findTypoPrefix(
      normalizedQuery,
      typoMaxEdits,
      TYPO_PER_TRIE_LIMIT,
    ),
    "typo-prefix",
    "player-last",
  );
  registerHits(
    matches,
    index.entries,
    index.tries.playerFirst.findTypoPrefix(
      normalizedQuery,
      typoMaxEdits,
      TYPO_PER_TRIE_LIMIT,
    ),
    "typo-prefix",
    "player-first",
  );

  return toSuggestions(
    Array.from(matches.values())
      .sort((a, b) =>
        compareSuggestions(
          {
            metadata: a.metadata,
            type: a.entry.type,
            sortName: a.entry.sortName,
            displayName: a.entry.displayName,
          },
          {
            metadata: b.metadata,
            type: b.entry.type,
            sortName: b.entry.sortName,
            displayName: b.entry.displayName,
          },
        ),
      )
      .slice(0, limit),
  );
}

export function toSuggestions(matches: SearchMatch[]): SearchSuggestion[] {
  return matches.map((match) => ({
    id: match.entry.id,
    type: match.entry.type,
    displayName: match.entry.displayName,
    subLabel: match.entry.subLabel,
    imageUrl: match.entry.imageUrl,
    href: match.entry.href,
    metadata: match.metadata,
  }));
}
