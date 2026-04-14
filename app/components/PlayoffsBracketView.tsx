"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Skeleton } from "@/app/components/skeleton";
import PlayoffSeriesCard from "@/app/components/PlayoffSeriesCard";
import type {
  BracketSeriesCard,
  PlayoffBracketPayload,
} from "@/app/types/playoffs";

interface PlayoffsBracketViewProps {
  showTitle?: boolean;
}

const BRACKET_CACHE_TTL_MS = 5 * 60 * 1000;
let bracketClientCache: {
  payload: PlayoffBracketPayload;
  cachedAt: number;
} | null = null;

const fetchBracket = async (url: string) => {
  if (
    bracketClientCache &&
    Date.now() - bracketClientCache.cachedAt < BRACKET_CACHE_TTL_MS
  ) {
    return bracketClientCache.payload;
  }

  const res = await fetch(url, { cache: "default" });
  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      (payload as { message?: string })?.message ??
        "Failed to load playoffs bracket",
    );
  }

  const parsed = payload as PlayoffBracketPayload;
  bracketClientCache = { payload: parsed, cachedAt: Date.now() };
  return parsed;
};

function formatDate(dateText: string) {
  const parsed = new Date(dateText);
  if (Number.isNaN(parsed.getTime())) {
    return dateText;
  }

  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function BracketSkeleton() {
  const roundSkeleton = [4, 2, 1, 1, 1, 2, 4];

  return (
    <div className="space-y-7 sm:space-y-8">
      <Skeleton className="h-[132px] w-full rounded-3xl" />

      <section className="rounded-2xl bg-[#27272b]/82 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-24" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {Array.from({ length: 2 }).map((_, confIdx) => (
            <div
              key={`playin-skel-${confIdx}`}
              className="rounded-2xl bg-[#2c2c2f]/78 p-4 sm:p-5"
            >
              <Skeleton className="h-5 w-48 mx-auto mb-4" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div
                  className={[
                    "space-y-6",
                    confIdx === 1 ? "md:order-2" : "md:order-1",
                  ].join(" ")}
                >
                  <Skeleton className="h-[124px] w-full rounded-xl" />
                  <Skeleton className="h-[124px] w-full rounded-xl" />
                </div>

                <div
                  className={[
                    "md:pt-[74px]",
                    confIdx === 1 ? "md:order-1" : "md:order-2",
                  ].join(" ")}
                >
                  <Skeleton className="h-[124px] w-full rounded-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-[#27272b]/82 p-4 sm:p-5 overflow-x-auto">
        <div className="min-w-[1220px]">
          <div className="grid grid-cols-7 gap-4">
            {roundSkeleton.map((count, colIdx) => (
              <div key={`round-skel-${colIdx}`}>
                <Skeleton className="h-4 w-24 mx-auto" />
                <div
                  className={[
                    "mt-3",
                    colIdx === 0 || colIdx === 6
                      ? "pt-0 space-y-4"
                      : colIdx === 1 || colIdx === 5
                        ? "pt-[69px] space-y-[154px]"
                        : colIdx === 3
                          ? "pt-[192px] space-y-4"
                          : "pt-[207px] space-y-4",
                  ].join(" ")}
                >
                  {Array.from({ length: count }).map((__, rowIdx) => (
                    <Skeleton
                      key={`card-skel-${colIdx}-${rowIdx}`}
                      className={[
                        "w-full rounded-xl",
                        colIdx === 3 ? "h-[164px]" : "h-[136px]",
                      ].join(" ")}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function BracketRoundColumn({
  label,
  cards,
  tone,
  roundLevel,
  isFinalsColumn,
}: {
  label: string;
  cards: BracketSeriesCard[];
  tone: "west" | "east" | "neutral";
  roundLevel: 0 | 1 | 2;
  isFinalsColumn?: boolean;
}) {
  const stackClass =
    roundLevel === 0
      ? "pt-0 space-y-4"
      : roundLevel === 1
        ? "pt-[69px] space-y-[154px]"
        : isFinalsColumn
          ? "pt-[192px] space-y-4"
          : "pt-[207px] space-y-4";

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-text/62 font-semibold text-center">
        {label}
      </p>

      <div className={["mt-3", stackClass].join(" ")}>
        {cards.map((card) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <PlayoffSeriesCard
              card={card}
              tone={tone}
              size={isFinalsColumn ? "finals" : "default"}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function PlayInConferenceCard({
  title,
  tone,
  cards,
}: {
  title: string;
  tone: "west" | "east";
  cards: BracketSeriesCard[];
}) {
  const isEast = tone === "east";
  const headingTone = tone === "west" ? "text-accent" : "text-secondary";

  if (cards.length < 3) {
    return (
      <div className="rounded-2xl p-4 sm:p-5 bg-[#2c2c2f]/78">
        <h3
          className={[
            "text-sm uppercase font-black tracking-[0.15em] mb-3 text-center",
            headingTone,
          ].join(" ")}
        >
          {title}
        </h3>
        <div className="space-y-5">
          {cards.map((card) => (
            <PlayoffSeriesCard
              key={card.id}
              card={card}
              size="compact"
              tone={tone}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-4 sm:p-5 bg-[#2c2c2f]/78">
      <h3
        className={[
          "text-sm uppercase tracking-[0.15em] mb-3 text-center",
          headingTone,
        ].join(" ")}
      >
        {title}
      </h3>

      <div className="relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div
            className={[
              "flex flex-col gap-6",
              isEast ? "md:order-2" : "md:order-1",
            ].join(" ")}
          >
            <PlayoffSeriesCard card={cards[0]} size="compact" tone={tone} />
            <PlayoffSeriesCard card={cards[1]} size="compact" tone={tone} />
          </div>

          <div
            className={[
              "md:pt-[74px]",
              isEast ? "md:order-1" : "md:order-2",
            ].join(" ")}
          >
            <PlayoffSeriesCard card={cards[2]} size="compact" tone={tone} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlayoffsBracketView({
  showTitle = true,
}: PlayoffsBracketViewProps) {
  const [data, setData] = useState<PlayoffBracketPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadBracket = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const payload = await fetchBracket("/api/playoffs/bracket");
        if (!isActive) return;
        setData(payload);
      } catch (fetchError) {
        if (!isActive) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load playoff bracket.",
        );
        setData(null);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadBracket();

    return () => {
      isActive = false;
    };
  }, []);

  if (isLoading) {
    return <BracketSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl bg-accent/10 p-5 text-sm text-accent">
        {error ?? "Failed to load playoff bracket."}
      </div>
    );
  }

  const generatedText = formatDate(data.generatedAt);
  const bracketColumns = [
    {
      label: "West 1st Round",
      cards: data.playoffs.west.firstRound,
      tone: "west" as const,
      roundLevel: 0 as const,
      isFinalsColumn: false,
    },
    {
      label: "West Semis",
      cards: data.playoffs.west.conferenceSemifinals,
      tone: "west" as const,
      roundLevel: 1 as const,
      isFinalsColumn: false,
    },
    {
      label: "West Finals",
      cards: data.playoffs.west.conferenceFinals,
      tone: "west" as const,
      roundLevel: 2 as const,
      isFinalsColumn: false,
    },
    {
      label: "NBA Finals",
      cards: [data.playoffs.finals],
      tone: "neutral" as const,
      roundLevel: 2 as const,
      isFinalsColumn: true,
    },
    {
      label: "East Finals",
      cards: data.playoffs.east.conferenceFinals,
      tone: "east" as const,
      roundLevel: 2 as const,
      isFinalsColumn: false,
    },
    {
      label: "East Semis",
      cards: data.playoffs.east.conferenceSemifinals,
      tone: "east" as const,
      roundLevel: 1 as const,
      isFinalsColumn: false,
    },
    {
      label: "East First",
      cards: data.playoffs.east.firstRound,
      tone: "east" as const,
      roundLevel: 0 as const,
      isFinalsColumn: false,
    },
  ];

  return (
    <div className="space-y-7 sm:space-y-8">
      {showTitle && (
        <section className="mb-4 sm:mb-5">
          <div className="rounded-3xl bg-[#2a2a2d]/88 px-5 py-6 sm:px-8 sm:py-8">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-3xl sm:text-5xl tracking-wide text-text text-center"
            >
              NBA Playoff Picture
            </motion.h1>
            <p className="mt-2 text-text/70 text-sm sm:text-base max-w-3xl mx-auto text-center">
              A cleaner bracket view designed to match Scoard cards, spacing,
              and typography.
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 text-[11px] uppercase tracking-[0.14em]">
              <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-text/70">
                Season {data.sourceSeason || data.season}
              </span>
              <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-text/70">
                Updated {generatedText}
              </span>
              <span className="rounded-full bg-accent/20 px-2.5 py-1 text-accent">
                {data.meta.availableSeriesPages} Live Series Pages
              </span>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl bg-[#27272b]/82 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display tracking-wide text-2xl text-text">
            Play-In Tournament *
          </h2>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <PlayInConferenceCard
            title="Western Conference"
            tone="west"
            cards={data.playIn.west}
          />

          <PlayInConferenceCard
            title="Eastern Conference"
            tone="east"
            cards={data.playIn.east}
          />
        </div>
      </section>

      <section className="rounded-2xl bg-[#27272b]/82 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-10">
          <h2 className="font-display tracking-wide text-2xl text-text">
            Playoff Bracket
          </h2>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="min-w-[1220px] relative">
            <div className="grid grid-cols-7 gap-4 relative">
              {bracketColumns.map((column) => (
                <BracketRoundColumn
                  key={column.label}
                  label={column.label}
                  cards={column.cards}
                  tone={column.tone}
                  roundLevel={column.roundLevel}
                  isFinalsColumn={column.isFinalsColumn}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-[#252529]/82 p-4 sm:p-6">
        <h3 className="mt-1 text-left font-display text-xl tracking-wide text-text">
          * Play-In Tournament Rules
        </h3>

        <ul className="mt-4 space-y-2.5 list-disc pl-5 text-sm sm:text-[15px] text-text/78">
          <li>
            Each conference runs a play-in with two opening games: 7 vs 8 and 9
            vs 10.
          </li>
          <li>The winner of 7 vs 8 locks the No. 7 seed in that conference.</li>
          <li>
            The loser of 7 vs 8 plays the winner of 9 vs 10 for the No. 8 seed.
          </li>
          <li>The loser of 9 vs 10 is eliminated immediately.</li>
        </ul>
      </section>
    </div>
  );
}
