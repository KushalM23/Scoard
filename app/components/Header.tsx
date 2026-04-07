"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, Search, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { SearchSuggestion } from "@/app/types/search";
import { getOrBuildSearchIndex } from "@/app/lib/search/bootstrapClient";
import { querySearchIndex } from "@/app/lib/search/index";
import { normalizeForSearch } from "@/app/lib/search/normalize";
import { Skeleton } from "@/app/components/skeleton";

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
  const [isSportOpen, setIsSportOpen] = useState(false);
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
      setIsSportOpen(false);
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
        <div className="rounded-lg border border-[#352e2e] bg-[#171313] px-3 py-3 space-y-2.5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`search-suggestion-skeleton-${index}`}
              className="h-[60px] rounded-lg border border-[#3c3434] bg-[#241f1f] px-3 flex items-center gap-3"
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
        <div className="rounded-lg border border-[#352e2e] bg-[#171313] px-4 py-4 text-sm text-secondary/90">
          {bootstrapError}
        </div>
      );
    }

    if (suggestions.length === 0) {
      return (
        <div className="rounded-lg border border-[#352e2e] bg-[#171313] px-4 py-4 text-sm text-text/60">
          No matches found.
        </div>
      );
    }

    return (
      <ul
        id={SEARCH_LISTBOX_ID}
        role="listbox"
        ref={listRef}
        className="rounded-lg border border-[#352e2e] bg-[#171313] overflow-y-auto scrollbar-hide"
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
              className={`h-[68px] px-3 md:px-4 flex items-center gap-3 cursor-pointer border-b border-[#3c3434] last:border-b-0 transition-colors ${
                isHighlighted ? "bg-[#302828]" : "hover:bg-[#241f1f]"
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

              <span className="text-[10px] font-bold tracking-wider px-2 py-1 rounded-full bg-[#312a2a] text-text/70">
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
      className="sticky top-1 z-50 px-4 sm:px-5 md:px-6 py-3 md:py-3 bg-transparent backdrop-blur-md"
    >
      <div className="w-full max-w-[1600px] mx-auto flex flex-wrap items-center gap-3 sm:gap-4 md:gap-7">
        <Link
          href="/"
          aria-label="Go to home page"
          className="flex-none order-1"
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

        <div className="order-3 basis-full relative min-w-0 md:order-2 md:basis-auto md:flex-1 md:min-w-[260px] md:max-w-[1020px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text/45 pointer-events-none" />
          {isLoadingBootstrap && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent animate-spin" />
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
            className="w-full h-10 md:h-11 pl-10 pr-10 rounded-xl glass bg-white/5 border border-white/10 focus:outline-none text-sm md:text-base text-text placeholder:text-text/45"
          />

          <AnimatePresence>
            {shouldShowSearchDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.16 }}
                className="absolute top-full left-0 right-0 mt-3 p-1.5 bg-[#191515] border border-[#4a3f3f] rounded-xl shadow-[0_22px_50px_rgba(0,0,0,0.65),0_8px_18px_rgba(0,0,0,0.45)] ring-1 ring-white/10 z-50"
              >
                {renderDropdownContent()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="order-2 ml-auto flex items-center gap-2 sm:gap-3 md:gap-4 lg:gap-5 flex-none md:order-3">
          <div className="relative">
            <motion.button
              onClick={() => setIsSportOpen(!isSportOpen)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-1.5 px-2.5 py-2 md:px-4 md:py-2.5 rounded-lg glass hover:bg-white/5 transition-all duration-300 border border-white/10 hover:border-accent/50 group"
            >
              <span className="font-medium font-display group-hover:text-accent transition-colors text-sm md:text-base">
                NBA
              </span>
              <motion.div
                animate={{ rotate: isSportOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4 text-text/60" />
              </motion.div>
            </motion.button>

            <AnimatePresence>
              {isSportOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="absolute top-full right-0 mt-3 w-56 bg-background border border-white/10 rounded-xl shadow-2xl py-2 z-50 overflow-hidden ring-1 ring-white/5"
                >
                  <div className="px-4 py-2 text-xs font-sans text-text/50 uppercase tracking-widest">
                    Select League
                  </div>

                  <motion.button
                    whileHover={{ color: "rgba(255, 255, 255, 0.05)" }}
                    className="w-full text-left px-4 py-3 flex items-center justify-between group transition-colors bg-white/5 border-l-2 border-accent"
                  >
                    <span className="font-bold font-display text-text">
                      NBA
                    </span>
                    <span className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_rgba(69,126,172,0.5)]"></span>
                  </motion.button>

                  <motion.button
                    whileHover={{ color: "rgba(255, 255, 255, 0.05)" }}
                    className="w-full text-left px-4 py-3 flex items-center justify-between group transition-colors border-l-2 border-transparent hover:border-white/20"
                  >
                    <span className="font-medium font-display text-text/70 group-hover:text-text transition-colors">
                      IPL
                    </span>
                    <span className="text-[10px] font-bold bg-secondary/10 px-2 py-0.5 rounded text-secondary">
                      SOON
                    </span>
                  </motion.button>

                  <motion.button
                    whileHover={{ color: "rgba(255, 255, 255, 0.05)" }}
                    className="w-full text-left px-4 py-3 flex items-center justify-between group transition-colors border-l-2 border-transparent hover:border-white/20"
                  >
                    <span className="font-medium font-display text-text/70 group-hover:text-text transition-colors">
                      F1
                    </span>
                    <span className="text-[10px] font-bold bg-secondary/10 px-2 py-0.5 rounded text-secondary">
                      SOON
                    </span>
                  </motion.button>
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
