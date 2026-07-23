"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/analytics";

interface TeamLinkProps {
  teamId: number;
  children: React.ReactNode;
  className?: string;
  sourceComponent?: string;
  stopPropagation?: boolean;
}

export default function TeamLink({
  teamId,
  children,
  className,
  sourceComponent = "unknown",
  stopPropagation = false,
}: TeamLinkProps) {
  return (
    <Link
      href={`/team/${teamId}`}
      className={className}
      onClick={(event) => {
        if (stopPropagation) {
          event.stopPropagation();
        }

        trackEvent("team_navigation_click_from_component", {
          teamId,
          sourceComponent,
        });
      }}
    >
      {children}
    </Link>
  );
}
