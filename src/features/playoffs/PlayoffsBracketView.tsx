"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useSeason } from "@/providers/SeasonProvider";
import type {
  BracketSeriesCard,
  PlayoffBracketPayload,
} from "@/types/playoffs";

interface PlayoffsBracketViewProps {
  showTitle?: boolean;
}

const BRACKET_CACHE_TTL_MS = 5 * 60 * 1000;
const bracketClientCache: Record<string, {
  payload: PlayoffBracketPayload;
  cachedAt: number;
}> = {};

const fetchBracket = async (url: string, season: string) => {
  const cached = bracketClientCache[season];
  if (
    cached &&
    Date.now() - cached.cachedAt < BRACKET_CACHE_TTL_MS
  ) {
    return cached.payload;
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
  bracketClientCache[season] = { payload: parsed, cachedAt: Date.now() };
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

      <section className="rounded-2xl bg-surface-card/80 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-24" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {Array.from({ length: 2 }).map((_, confIdx) => (
            <div
              key={`playin-skel-${confIdx}`}
              className="rounded-2xl bg-surface-panel/80 p-4 sm:p-5"
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

      <section className="rounded-2xl bg-surface-card/80 p-4 sm:p-5 overflow-x-auto">
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

type SeriesTone = "west" | "east" | "neutral";
type SeriesSize = "compact" | "default" | "finals";

function teamRowClass(team: BracketSeriesCard["teams"]["top"]) {
  if (team.state === "advanced") return "bg-accent/12 text-text";
  if (team.state === "eliminated") return "bg-white/[0.03] text-text/45";
  if (team.state === "tbd") return "bg-white/[0.02] text-text/65";
  return "bg-white/[0.05] text-text";
}

function getSeriesHref(card: BracketSeriesCard) {
  if (card.pageAvailable && card.href) {
    return card.href;
  }

  if (card.phase !== "play_in") {
    return null;
  }

  if (card.teams.top.isTbd || card.teams.bottom.isTbd) {
    return null;
  }

  const playInGameId =
    card.summary.nextGame?.gameId ?? card.summary.lastCompletedGame?.gameId;

  return playInGameId ? `/game/${playInGameId}` : null;
}

function PlayoffSeriesCard({
  card,
  tone = "neutral",
  size = "default",
}: {
  card: BracketSeriesCard;
  tone?: SeriesTone;
  size?: SeriesSize;
}) {
  const href = getSeriesHref(card);
  const toneHover =
    tone === "west"
      ? "hover:bg-accent/[0.08]"
      : tone === "east"
        ? "hover:bg-secondary/[0.08]"
        : "hover:bg-white/[0.07]";

  const cardClass =
    size === "compact"
      ? "min-h-[124px] p-3 space-y-2"
      : size === "finals"
        ? "min-h-[164px] p-4 space-y-3"
        : "min-h-[136px] p-3.5 space-y-2.5";

  const content = (
    <div
      className={[
        "rounded-xl bg-white/[0.04] transition-all overflow-hidden",
        cardClass,
        href
          ? `${toneHover} hover:shadow-[0_10px_24px_rgba(0,0,0,0.2)]`
          : "cursor-default",
      ].join(" ")}
    >
      {([card.teams.top, card.teams.bottom] as const).map((team) => {
        const isTbd = team.isTbd || !team.teamId;
        const rowHeight =
          size === "compact"
            ? "h-[46px]"
            : size === "finals"
              ? "h-[56px]"
              : "h-[50px]";
        const logoSize =
          size === "compact"
            ? "w-5 h-5"
            : size === "finals"
              ? "w-7 h-7"
              : "w-6 h-6";

        return (
          <div
            key={`${card.id}-${team.teamId ?? team.displayName}`}
            className={[
              "rounded-lg px-3 flex items-center gap-2.5 transition-colors",
              rowHeight,
              teamRowClass(team),
            ].join(" ")}
          >
            {isTbd ? (
              <p className="min-w-0 flex-1 text-sm font-semibold leading-none tracking-wide">
                TBD
              </p>
            ) : (
              <>
                {team.logoUrl && (
                  <img
                    src={team.logoUrl}
                    alt={team.displayName}
                    className={[logoSize, "object-contain shrink-0"].join(" ")}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-none tracking-wide">
                    {team.tricode}
                  </p>
                </div>
                {team.seed !== null && (
                  <span className="shrink-0 rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[11px] text-text/65">
                    #{team.seed}
                  </span>
                )}
              </>
            )}

            <span
              className={[
                "font-display leading-none text-text shrink-0",
                size === "finals" ? "text-2xl" : "text-xl",
              ].join(" ")}
            >
              {team.seriesWins}
            </span>
          </div>
        );
      })}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
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

const MOBILE_BRACKET_COLUMN_WIDTH = 184;
const MOBILE_BRACKET_COLUMN_GAP = 72;
const MOBILE_BRACKET_CARD_HEIGHT = 124;
const MOBILE_BRACKET_HEIGHT = 1180;

type MobileBracketColumn = {
  label: string;
  cards: Array<{
    card: BracketSeriesCard;
    tone: "east" | "west" | "neutral";
    top: number;
    size?: SeriesSize;
  }>;
};

function MobileBracketConnectors() {
  const x = [
    0,
    MOBILE_BRACKET_COLUMN_WIDTH + MOBILE_BRACKET_COLUMN_GAP,
    (MOBILE_BRACKET_COLUMN_WIDTH + MOBILE_BRACKET_COLUMN_GAP) * 2,
    (MOBILE_BRACKET_COLUMN_WIDTH + MOBILE_BRACKET_COLUMN_GAP) * 3,
  ];
  const cardRight = (column: number) => x[column] + MOBILE_BRACKET_COLUMN_WIDTH;
  const cardCenter = (top: number, height = MOBILE_BRACKET_CARD_HEIGHT) =>
    top + height / 2;

  const pairPaths = (
    fromColumn: number,
    fromTops: number[],
    toColumn: number,
    toTops: number[],
    color: string,
  ) =>
    [0, 1].flatMap((pair) => {
      const fromTop = fromTops[pair * 2];
      const fromBottom = fromTops[pair * 2 + 1];
      const target = toTops[pair];
      const elbow = cardRight(fromColumn) + MOBILE_BRACKET_COLUMN_GAP / 2;

      return [
        <path
          key={`${fromColumn}-${toColumn}-${pair}-top`}
          d={`M ${cardRight(fromColumn)} ${cardCenter(fromTop)} H ${elbow} V ${cardCenter(target)}`}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
        />,
        <path
          key={`${fromColumn}-${toColumn}-${pair}-bottom`}
          d={`M ${cardRight(fromColumn)} ${cardCenter(fromBottom)} H ${elbow} V ${cardCenter(target)}`}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
        />,
        <path
          key={`${fromColumn}-${toColumn}-${pair}-target`}
          d={`M ${elbow} ${cardCenter(target)} H ${x[toColumn]}`}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
        />,
      ];
    });

  const eastFirstRound = [0, 136, 272, 408];
  const eastSemis = [68, 340];
  const eastFinal = [204];
  const westFirstRound = [544, 680, 816, 952];
  const westSemis = [612, 884];
  const westFinal = [748];

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible"
      viewBox={`0 0 ${x[3] + MOBILE_BRACKET_COLUMN_WIDTH} ${MOBILE_BRACKET_HEIGHT}`}
      preserveAspectRatio="none"
    >
      {pairPaths(0, eastFirstRound, 1, eastSemis, "rgba(213, 85, 85, 0.42)")}
      {pairPaths(1, eastSemis, 2, eastFinal, "rgba(213, 85, 85, 0.42)")}
      {pairPaths(0, westFirstRound, 1, westSemis, "rgba(111, 168, 255, 0.42)")}
      {pairPaths(1, westSemis, 2, westFinal, "rgba(111, 168, 255, 0.42)")}
      <path
        d={`M ${cardRight(2)} ${cardCenter(eastFinal[0])} H ${x[3] - MOBILE_BRACKET_COLUMN_GAP / 2} V ${cardCenter(480, 164)}`}
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.5"
      />
      <path
        d={`M ${cardRight(2)} ${cardCenter(westFinal[0])} H ${x[3] - MOBILE_BRACKET_COLUMN_GAP / 2} V ${cardCenter(480, 164)}`}
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function MobileBracketColumnView({ column }: { column: MobileBracketColumn }) {
  return (
    <div className="absolute left-0 top-0 w-full">
      <p className="absolute -top-8 w-full text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-text/50">
        {column.label}
      </p>
      {column.cards.map(({ card, tone, top, size }) => (
        <motion.div
          key={card.id}
          className="absolute left-0 w-full"
          style={{ top }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <PlayoffSeriesCard card={card} tone={tone} size={size ?? "compact"} />
        </motion.div>
      ))}
    </div>
  );
}

function MobileBracketRail({
  columns,
  height,
  connectors,
}: {
  columns: MobileBracketColumn[];
  height: number;
  connectors: ReactNode;
}) {
  const columnStep = MOBILE_BRACKET_COLUMN_WIDTH + MOBILE_BRACKET_COLUMN_GAP;
  const canvasWidth = columnStep * columns.length - MOBILE_BRACKET_COLUMN_GAP;

  return (
    <div className="md:hidden">
      <div className="scrollbar-hide -mx-4 snap-x snap-mandatory overflow-x-auto px-4 scroll-smooth">
        <div
          className="relative mt-8"
          style={{ width: canvasWidth, height }}
        >
          <div className="absolute left-0 top-0 z-10 flex h-full" style={{ gap: MOBILE_BRACKET_COLUMN_GAP }}>
            {columns.map((column, index) => (
              <div
                key={`${column.label}-${index}`}
                className="relative h-full shrink-0 snap-start"
                style={{ width: MOBILE_BRACKET_COLUMN_WIDTH }}
              >
                <MobileBracketColumnView
                  column={column}
                />
              </div>
            ))}
          </div>
          {connectors}
        </div>
      </div>
    </div>
  );
}

function MobileBracket({ columns }: { columns: MobileBracketColumn[] }) {
  return (
    <MobileBracketRail
      columns={columns}
      height={MOBILE_BRACKET_HEIGHT}
      connectors={<MobileBracketConnectors />}
    />
  );
}

function MobilePlayInBracket({
  playIn,
}: {
  playIn: NonNullable<PlayoffBracketPayload["playIn"]>;
}) {
  const canvasHeight = 700;
  const firstRoundEastTops = [0, 136];
  const firstRoundWestTops = [400, 536];
  const decidingEastTop = 68;
  const decidingWestTop = 468;
  const cardRight = MOBILE_BRACKET_COLUMN_WIDTH;
  const secondColumnX = MOBILE_BRACKET_COLUMN_WIDTH + MOBILE_BRACKET_COLUMN_GAP;
  const elbowX = cardRight + MOBILE_BRACKET_COLUMN_GAP / 2;
  const center = (top: number) => top + MOBILE_BRACKET_CARD_HEIGHT / 2;

  const renderConnectors = (tops: number[], targetTop: number, color: string) => (
    <>
      {tops.map((top) => (
        <path
          key={`${targetTop}-${top}`}
          d={`M ${cardRight} ${center(top)} H ${elbowX} V ${center(targetTop)}`}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
        />
      ))}
    </>
  );

  const columns: MobileBracketColumn[] = [
    {
      label: "Opening Games",
      cards: [
        ...playIn.east.slice(0, 2).map((card, index) => ({
          card,
          tone: "east" as const,
          top: firstRoundEastTops[index] ?? index * 136,
        })),
        ...playIn.west.slice(0, 2).map((card, index) => ({
          card,
          tone: "west" as const,
          top: firstRoundWestTops[index] ?? 400 + index * 136,
        })),
      ],
    },
    {
      label: "Play-In Decider",
      cards: [
        playIn.east[2] && {
          card: playIn.east[2],
          tone: "east" as const,
          top: decidingEastTop,
        },
        playIn.west[2] && {
          card: playIn.west[2],
          tone: "west" as const,
          top: decidingWestTop,
        },
      ].filter(Boolean) as MobileBracketColumn["cards"],
    },
  ];

  const canvasWidth = MOBILE_BRACKET_COLUMN_WIDTH * 2 + MOBILE_BRACKET_COLUMN_GAP;
  const connectors = (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible"
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      preserveAspectRatio="none"
    >
      {renderConnectors(firstRoundEastTops, decidingEastTop, "rgba(213, 85, 85, 0.42)")}
      {renderConnectors(firstRoundWestTops, decidingWestTop, "rgba(111, 168, 255, 0.42)")}
    </svg>
  );

  return (
    <MobileBracketRail
      columns={columns}
      height={canvasHeight}
      connectors={connectors}
    />
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
      <div className="rounded-2xl p-4 sm:p-5">
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
    <div className="rounded-2xl p-4 sm:p-5 bg-surface-panel/80">
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
  const { season: globalSeason } = useSeason();
  const [data, setData] = useState<PlayoffBracketPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadBracket = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const payload = await fetchBracket(
          `/api/playoffs/bracket?season=${globalSeason}`,
          globalSeason
        );
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
  }, [globalSeason]);

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

  const mobileBracketColumns: MobileBracketColumn[] = [
    {
      label: "First Round",
      cards: [
        ...data.playoffs.east.firstRound.map((card, index) => ({
          card,
          tone: "east" as const,
          top: [0, 136, 272, 408][index] ?? index * 136,
        })),
        ...data.playoffs.west.firstRound.map((card, index) => ({
          card,
          tone: "west" as const,
          top: [544, 680, 816, 952][index] ?? 544 + index * 136,
        })),
      ],
    },
    {
      label: "Conference Semifinals",
      cards: [
        ...data.playoffs.east.conferenceSemifinals.map((card, index) => ({
          card,
          tone: "east" as const,
          top: [68, 340][index] ?? 68 + index * 272,
        })),
        ...data.playoffs.west.conferenceSemifinals.map((card, index) => ({
          card,
          tone: "west" as const,
          top: [612, 884][index] ?? 612 + index * 272,
        })),
      ],
    },
    {
      label: "Conference Finals",
      cards: [
        ...data.playoffs.east.conferenceFinals.map((card) => ({
          card,
          tone: "east" as const,
          top: 204,
        })),
        ...data.playoffs.west.conferenceFinals.map((card) => ({
          card,
          tone: "west" as const,
          top: 748,
        })),
      ],
    },
    {
      label: "NBA Finals",
      cards: [
        { card: data.playoffs.finals, tone: "neutral" as const, top: 480, size: "finals" as const },
      ],
    },
  ];

  return (
    <div className="space-y-7 sm:space-y-8">
      {showTitle && (
        <section className="mb-4 sm:mb-5">
          <div className="rounded-3xl px-5 py-6 sm:px-8 sm:py-8">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-3xl sm:text-5xl tracking-wide text-text text-center"
            >
              NBA Playoffs
            </motion.h1>
          </div>
        </section>
      )}

      {data.playIn && (
        <section className="rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display tracking-wide text-2xl text-text">
              Play-In Tournament *
            </h2>
          </div>

          <div className="hidden grid-cols-1 gap-5 xl:grid md:grid">
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

          <MobilePlayInBracket playIn={data.playIn} />
        </section>
      )}

      <section className="rounded-2xl p-4 sm:p-5">

        <MobileBracket columns={mobileBracketColumns} />

        <div className="hidden overflow-x-auto pb-1 md:block">
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

      {data.playIn && (
        <section className="rounded-2xl bg-surface-panel/80 p-4 sm:p-6">
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
      )}
    </div>
  );
}
