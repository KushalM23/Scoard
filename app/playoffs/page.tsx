import type { Metadata } from "next";
import PlayoffsClient from "./PlayoffsClient";

export const metadata: Metadata = {
  title: "NBA Playoffs Bracket | Scoard",
  description:
    "Tournament bracket for the NBA playoffs, including play-in and full series progression.",
  alternates: {
    canonical: "/playoffs",
  },
};

export default function PlayoffsPage() {
  return <PlayoffsClient />;
}
