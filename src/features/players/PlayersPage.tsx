"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { motion } from "framer-motion";
import PlayerLink from "@/components/links/PlayerLink";
import TeamLink from "@/components/links/TeamLink";
import { Skeleton } from "@/components/ui/skeleton";
import type { SearchPlayerRecord } from "@/types/search";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const PAGE_SIZE = 25;

function PlayerCard({ player }: { player: SearchPlayerRecord }) {
  const [imageSrc, setImageSrc] = useState(player.headshotUrl);
  const teamLogo = `https://cdn.nba.com/logos/nba/${player.teamId}/primary/L/logo.svg`;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="group flex h-[62px] min-w-0 items-center gap-1 overflow-hidden rounded-lg border border-surface-borderLight bg-white/5 p-1 text-text transition-colors hover:text-accent sm:h-[78px] sm:gap-2 sm:p-2"
    >
      <PlayerLink
        playerId={player.id}
        sourceComponent="players_grid"
        className="relative flex h-[50px] w-[52px] shrink-0 items-end justify-center overflow-hidden rounded-md border border-surface-border bg-white/10 sm:h-[60px] sm:w-[62px]"
      >
        <div className="absolute inset-x-0 bottom-0 h-8" />
        <img
          src={imageSrc}
          alt={`${player.displayName} headshot`}
          className="relative h-full w-full object-contain object-bottom transition-transform duration-300 group-hover:scale-105"
          onError={() => setImageSrc("https://cdn.nba.com/headshots/nba/latest/260x190/fallback.png")}
        />
      </PlayerLink>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 sm:gap-1.5">
        <PlayerLink
          playerId={player.id}
          sourceComponent="players_grid"
          className="line-clamp-2 min-w-0 font-display text-[11px] uppercase leading-tight tracking-wide transition-colors hover:text-accent sm:text-sm"
        >
          <span className="block">{player.displayName}</span>
        </PlayerLink>

        <TeamLink
          teamId={player.teamId}
          sourceComponent="players_grid"
          className="flex min-w-0 items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-text/55 transition-colors hover:text-accent sm:gap-1.5 sm:text-[10px] sm:tracking-[0.14em]"
        >
          <img src={teamLogo} alt="" className="h-3.5 w-3.5 shrink-0 object-contain sm:h-4 sm:w-4" />
          <span className="truncate">{player.teamTricode || "FA"}</span>
        </TeamLink>
      </div>
    </motion.article>
  );
}

function PlayerCardSkeleton() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg flex h-[62px] items-center gap-1 overflow-hidden p-1 sm:h-[78px] sm:gap-2 sm:p-2">
      <Skeleton className="h-[50px] w-[52px] shrink-0 rounded-md sm:h-[60px] sm:w-[62px]" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<SearchPlayerRecord[]>([]);
  const [selectedLetter, setSelectedLetter] = useState("A");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPlayers() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/search/bootstrap");
        if (!response.ok) throw new Error("Unable to load players");
        const payload = (await response.json()) as { players?: SearchPlayerRecord[] };
        if (!cancelled) setPlayers(Array.isArray(payload.players) ? payload.players : []);
      } catch {
        if (!cancelled) setError("Players are temporarily unavailable. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPlayers();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredPlayers = useMemo(
    () =>
      players
        .filter((player) => player.firstName.trim().toUpperCase().startsWith(selectedLetter))
        .sort((a, b) =>
          `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
        ),
    [players, selectedLetter],
  );

  const totalPages = Math.max(1, Math.ceil(filteredPlayers.length / PAGE_SIZE));
  const visiblePlayers = filteredPlayers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const changeLetter = (letter: string) => {
    setSelectedLetter(letter);
    setPage(1);
  };

  return (
    <main className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
      <nav aria-label="Filter players by first-name initial" className="mb-5 sm:mb-8">
        <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-1 sm:gap-2">
            {ALPHABET.map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={() => changeLetter(letter)}
                aria-pressed={selectedLetter === letter}
                className={`flex h-7 items-center justify-center rounded-md border font-display text-[10px] transition-colors sm:h-10 sm:text-base ${
                  selectedLetter === letter
                    ? "border-accent bg-accent"
                    : "border-white/10 bg-white/[0.06] text-text/65 hover:border-white/30 hover:text-text"
                }`}
              >
                {letter}
              </button>
            ))}
        </div>
      </nav>

      {loading ? (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-5 lg:gap-4 xl:grid-cols-5">
          {Array.from({ length: PAGE_SIZE }).map((_, index) => <PlayerCardSkeleton key={index} />)}
        </div>
      ) : error ? (
        <div className="bg-white/5 border border-white/10 rounded-lg p-8 text-center text-red-300">{error}</div>
      ) : visiblePlayers.length ? (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-5 lg:gap-4 xl:grid-cols-5">
          {visiblePlayers.map((player) => <PlayerCard key={player.id} player={player} />)}
        </div>
      ) : (
        <div className="p-10 text-center">
          <p className="font-display uppercase tracking-wider text-text">No players found</p>
          <p className="mt-2 text-sm text-text/55">There are no active players whose first name starts with {selectedLetter}.</p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-3 items-center border-t border-white/10 pt-4 sm:mt-8 sm:pt-5">
        <div />
        <div className="flex items-center justify-self-center gap-1">
          <button
          type="button"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={page === 1 || loading || Boolean(error)}
          aria-label="Previous page"
          className="inline-flex h-9 w-9 items-center justify-center text-text transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            onClick={() => setPage(pageNumber)}
            aria-label={`Go to page ${pageNumber}`}
            aria-current={page === pageNumber ? "page" : undefined}
            className={`h-9 min-w-9 px-2 font-display text-sm transition-colors ${
              page === pageNumber
                ? "text-accent"
                : "text-text/60 hover:text-text"
            }`}
          >
            {pageNumber}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          disabled={page >= totalPages || loading || Boolean(error)}
          aria-label="Next page"
          className="inline-flex h-9 w-9 items-center justify-center text-text transition-colors hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        </div>
        <div className="justify-self-end">
          {!loading && !error && (
            <p className="text-right text-sm text-text/50">
            {filteredPlayers.length} player{filteredPlayers.length === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
