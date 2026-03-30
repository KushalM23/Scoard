"use client";

import Link from "next/link";
import { trackEvent } from "@/app/lib/analytics";

interface PlayerLinkProps {
  playerId: number;
  children: React.ReactNode;
  className?: string;
  sourceComponent?: string;
  stopPropagation?: boolean;
}

export default function PlayerLink({
  playerId,
  children,
  className,
  sourceComponent = "unknown",
  stopPropagation = false,
}: PlayerLinkProps) {
  return (
    <Link
      href={`/player/${playerId}`}
      className={className}
      onClick={(event) => {
        if (stopPropagation) {
          event.stopPropagation();
        }

        trackEvent("player_navigation_click_from_component", {
          playerId,
          sourceComponent,
        });
      }}
    >
      {children}
    </Link>
  );
}
