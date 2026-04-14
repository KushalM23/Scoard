import Link from "next/link";
import type { BracketSeriesCard } from "@/app/types/playoffs";

type SeriesTone = "west" | "east" | "neutral";
type SeriesSize = "compact" | "default" | "finals";

interface PlayoffSeriesCardProps {
  card: BracketSeriesCard;
  tone?: SeriesTone;
  size?: SeriesSize;
}

function teamRowClass(team: BracketSeriesCard["teams"]["top"]) {
  if (team.state === "advanced") {
    return "bg-accent/12 text-text";
  }
  if (team.state === "eliminated") {
    return "bg-white/[0.03] text-text/45";
  }
  if (team.state === "tbd") {
    return "bg-white/[0.02] text-text/65";
  }
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

function TeamRow({
  team,
  size,
}: {
  team: BracketSeriesCard["teams"]["top"];
  size: SeriesSize;
}) {
  const isTbd = team.isTbd || !team.teamId;
  const rowHeight =
    size === "compact"
      ? "h-[46px]"
      : size === "finals"
        ? "h-[56px]"
        : "h-[50px]";
  const logoSize =
    size === "compact" ? "w-5 h-5" : size === "finals" ? "w-7 h-7" : "w-6 h-6";

  return (
    <div
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
            <p className="text-sm font-semibold leading-none truncate tracking-wide">
              {team.tricode}
            </p>
          </div>

          {team.seed !== null && (
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-text/65 shrink-0">
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
}

export default function PlayoffSeriesCard({
  card,
  tone = "neutral",
  size = "default",
}: PlayoffSeriesCardProps) {
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
      <TeamRow team={card.teams.top} size={size} />
      <TeamRow team={card.teams.bottom} size={size} />
    </div>
  );

  if (!href) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}
