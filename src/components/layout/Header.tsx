"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { SearchSuggestion } from "@/types/search";
import { getOrBuildSearchIndex } from "@/lib/search/bootstrapClient";
import { querySearchIndex } from "@/lib/search/index";
import { normalizeForSearch } from "@/lib/search/normalize";
import { Skeleton } from "@/components/ui/skeleton";

const SEARCH_LISTBOX_ID = "global-header-search-listbox";
const SEARCH_INPUT_ID = "global-header-search-input";
const SEARCH_ROW_HEIGHT = 68;
const VISIBLE_ROWS = 5;
const PLAYER_HEADSHOT_FALLBACK =
  "https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png";
const TEAM_LOGO_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='32' fill='%232c2525'/%3E%3Ctext x='32' y='39' text-anchor='middle' font-size='22' fill='%23faf0d5' font-family='Arial'%3ET%3C/text%3E%3C/svg%3E";

function getSuggestionId(index: number): string {
  return `global-search-option-${index}`;
}

  const Header: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoadingBootstrap, setIsLoadingBootstrap] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const hasPreloadedRef = useRef(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const hasTypedQuery = useMemo(
    () => normalizeForSearch(query).length > 0,
    [query],
  );

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

  const preloadSearch = useCallback(async () => {
    if (hasPreloadedRef.current) {
      return;
    }

    hasPreloadedRef.current = true;
    setIsLoadingBootstrap(true);

    try {
      await getOrBuildSearchIndex();
      setBootstrapError(null);
    } catch (error) {
      console.error("Failed to preload global search index:", error);
      setBootstrapError("Search is temporarily unavailable.");
      hasPreloadedRef.current = false;
    } finally {
      setIsLoadingBootstrap(false);
    }
  }, []);

  const runQuery = useCallback(async (nextQuery: string) => {
    const normalized = normalizeForSearch(nextQuery);
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (!normalized) {
      setSuggestions([]);
      setHighlightedIndex(0);
      setIsSearchOpen(false);
      return;
    }

    setIsSearchOpen(true);
    setIsLoadingBootstrap(true);

    try {
      const index = await getOrBuildSearchIndex();
      if (requestId !== requestIdRef.current) {
        return;
      }

      const nextSuggestions = querySearchIndex(index, nextQuery);
      setSuggestions(nextSuggestions);
      setHighlightedIndex(nextSuggestions.length > 0 ? 0 : -1);
      setBootstrapError(null);
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      console.error("Failed to query search index:", error);
      setSuggestions([]);
      setHighlightedIndex(-1);
      setBootstrapError("Search is temporarily unavailable.");
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoadingBootstrap(false);
      }
    }
  }, []);

  const selectSuggestion = useCallback(
    (suggestion?: SearchSuggestion) => {
      if (!suggestion) {
        return;
      }

      setQuery("");
      setSuggestions([]);
      setHighlightedIndex(0);
      setIsSearchOpen(false);
      router.push(suggestion.href);
    },
    [router],
  );

  const scrollHighlightedIntoView = useCallback((index: number) => {
    const list = listRef.current;
    if (!list) {
      return;
    }

    const option = document.getElementById(getSuggestionId(index));
    option?.scrollIntoView({ block: "nearest" });
  }, []);

  useEffect(() => {
    void preloadSearch();
  }, [preloadSearch]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      if (rootRef.current?.contains(target)) {
        return;
      }

      closeSearch();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [closeSearch]);

  useEffect(() => {
    if (
      !isSearchOpen ||
      highlightedIndex < 0 ||
      highlightedIndex >= suggestions.length
    ) {
      return;
    }

    scrollHighlightedIntoView(highlightedIndex);
  }, [
    highlightedIndex,
    isSearchOpen,
    scrollHighlightedIntoView,
    suggestions.length,
  ]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setQuery(nextValue);
    void runQuery(nextValue);
  };

  const handleInputFocus = () => {
    if (!hasTypedQuery) {
      void preloadSearch();
      return;
    }

    if (suggestions.length > 0 || bootstrapError || isLoadingBootstrap) {
      setIsSearchOpen(true);
      return;
    }

    void runQuery(query);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const totalSuggestions = suggestions.length;

    if (event.key === "ArrowDown") {
      if (totalSuggestions === 0) {
        return;
      }

      event.preventDefault();
      setIsSearchOpen(true);

      const nextIndex =
        highlightedIndex < 0 ? 0 : (highlightedIndex + 1) % totalSuggestions;
      setHighlightedIndex(nextIndex);
      return;
    }

    if (event.key === "ArrowUp") {
      if (totalSuggestions === 0) {
        return;
      }

      event.preventDefault();
      setIsSearchOpen(true);

      const nextIndex =
        highlightedIndex < 0
          ? totalSuggestions - 1
          : (highlightedIndex - 1 + totalSuggestions) % totalSuggestions;
      setHighlightedIndex(nextIndex);
      return;
    }

    if (event.key === "Enter") {
      if (totalSuggestions === 0) {
        return;
      }

      event.preventDefault();
      const activeIndex = highlightedIndex >= 0 ? highlightedIndex : 0;
      selectSuggestion(suggestions[activeIndex]);
      return;
    }

    if (event.key === "Tab") {
      if (totalSuggestions === 0) {
        return;
      }

      event.preventDefault();
      const activeIndex = highlightedIndex >= 0 ? highlightedIndex : 0;
      selectSuggestion(suggestions[activeIndex]);
      return;
    }

    if (event.key === "Escape") {
      closeSearch();
    }
  };

  const renderHighlightedText = useCallback(
    (text: string) => {
      const needle = query.trim();
      if (!needle) {
        return text;
      }

      const lowerText = text.toLowerCase();
      const lowerNeedle = needle.toLowerCase();
      const start = lowerText.indexOf(lowerNeedle);

      if (start === -1) {
        return text;
      }

      const end = start + needle.length;
      return (
        <>
          {text.slice(0, start)}
          <span className="text-accent">{text.slice(start, end)}</span>
          {text.slice(end)}
        </>
      );
    },
    [query],
  );

  const renderDropdownContent = () => {
    if (isLoadingBootstrap && suggestions.length === 0) {
      return (
        <div className="rounded-lg border border-surface-border bg-surface-dark px-3 py-3 space-y-2.5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`search-suggestion-skeleton-${index}`}
              className="h-[60px] rounded-lg border border-surface-borderLight bg-surface-hover px-3 flex items-center gap-3"
            >
              <Skeleton className="w-10 h-10 rounded-full bg-white/10" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-2/3 bg-white/10" />
                <Skeleton className="h-3 w-1/2 bg-white/10" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full bg-white/10" />
            </div>
          ))}
        </div>
      );
    }

    if (bootstrapError) {
      return (
        <div className="rounded-lg border border-surface-border bg-surface-dark px-4 py-4 text-sm text-secondary/90">
          {bootstrapError}
        </div>
      );
    }

    if (suggestions.length === 0) {
      return (
        <div className="rounded-lg border border-surface-border bg-surface-dark px-4 py-4 text-sm text-text/60">
          No matches found.
        </div>
      );
    }

    return (
      <ul
        id={SEARCH_LISTBOX_ID}
        role="listbox"
        ref={listRef}
        className="rounded-lg border border-surface-border bg-surface-dark overflow-y-auto scrollbar-hide"
        style={{ maxHeight: `${SEARCH_ROW_HEIGHT * VISIBLE_ROWS}px` }}
      >
        {suggestions.map((suggestion, index) => {
          const isHighlighted = index === highlightedIndex;

          return (
            <li
              id={getSuggestionId(index)}
              key={`${suggestion.type}-${suggestion.id}-${index}`}
              role="option"
              aria-selected={isHighlighted}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => selectSuggestion(suggestion)}
              className={`h-[68px] px-3 md:px-4 flex items-center gap-3 cursor-pointer border-b border-surface-borderLight last:border-b-0 transition-colors ${
                isHighlighted ? "bg-surface-elevated" : "hover:bg-surface-hover"
              }`}
            >
              <img
                src={suggestion.imageUrl}
                alt={suggestion.displayName}
                className="w-11 h-11 rounded-full object-cover bg-white/10"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src =
                    suggestion.type === "player"
                      ? PLAYER_HEADSHOT_FALLBACK
                      : TEAM_LOGO_FALLBACK;
                }}
              />

              <div className="min-w-0 flex-1">
                <p className="text-sm md:text-base font-semibold text-text truncate">
                  {renderHighlightedText(suggestion.displayName)}
                </p>
                <p className="text-xs text-text/70 truncate">
                  {renderHighlightedText(suggestion.subLabel)}
                </p>
              </div>

              <span className="text-[10px] font-display tracking-wider px-2 py-1 rounded-full bg-surface-elevated text-text/70">
                {suggestion.type === "team" ? "TEAM" : "PLAYER"}
              </span>
            </li>
          );
        })}
      </ul>
    );
  };

  const shouldShowSearchDropdown = isSearchOpen && hasTypedQuery;
  const activeDescendantId =
    shouldShowSearchDropdown &&
    highlightedIndex >= 0 &&
    suggestions[highlightedIndex]
      ? getSuggestionId(highlightedIndex)
      : undefined;

  return (
    <header
      ref={rootRef}
      className="sticky top-1 z-50 bg-transparent px-4 py-3 backdrop-blur-md sm:px-5 md:px-6"
    >
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            aria-label="Go to home page"
            className="shrink-0"
          >
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, type: "spring" }}
              className="text-[2.35rem] sm:text-[3rem] md:text-[4.2rem] lg:text-[5rem] font-mono tracking-wider text-primary drop-shadow-sm cursor-pointer leading-[0.86]"
            >
              SCOARD!
            </motion.h1>
          </Link>

          <nav className="ml-auto flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-right sm:gap-x-5">
            <Link
              href="/"
              className={`font-display text-xs sm:text-sm font-bold tracking-wider transition-colors duration-200 uppercase ${
                pathname === "/"
                  ? "text-primary"
                  : "text-text/60 hover:text-text"
              }`}
            >
              HOME
            </Link>
            <Link
              href="/playoffs"
              className={`font-display text-xs sm:text-sm font-bold tracking-wider transition-colors duration-200 uppercase ${
                pathname?.startsWith("/playoffs")
                  ? "text-primary"
                  : "text-text/60 hover:text-text"
              }`}
            >
              Playoffs
            </Link>
          </nav>
        </div>
        <div className="w-full">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text/45" />
            {isLoadingBootstrap && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-accent" />
            )}

            <input
              id={SEARCH_INPUT_ID}
              type="text"
              value={query}
              placeholder="Search"
              onFocus={handleInputFocus}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              role="combobox"
              aria-expanded={shouldShowSearchDropdown}
              aria-controls={SEARCH_LISTBOX_ID}
              aria-activedescendant={activeDescendantId}
              aria-autocomplete="list"
              className="h-10 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-10 text-sm text-text placeholder:text-text/45 focus:outline-none md:h-11 md:text-base"
            />

            <AnimatePresence>
              {shouldShowSearchDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 right-0 top-full z-50 mt-2 origin-top"
                >
                  {renderDropdownContent()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
