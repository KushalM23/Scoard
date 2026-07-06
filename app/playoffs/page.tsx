import type { Metadata } from "next";
import PlayoffsClient from "./PlayoffsClient";

export const metadata: Metadata = {
  title: "NBA Playoff Bracket & Picture | Scoard!",
  description: "View the official NBA Playoff Picture, play-in tournament matchups, and complete playoff bracket history on Scoard.",
};

export default function PlayoffsPage() {
  return <PlayoffsClient />;
}
