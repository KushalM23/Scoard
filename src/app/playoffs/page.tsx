import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Layout from "@/components/layout/AppShell";
import PlayoffsBracketView from "@/features/playoffs/PlayoffsBracketView";

export const metadata: Metadata = {
  title: "NBA Playoff Bracket & Picture | Scoard!",
  description: "View the official NBA Playoff Picture, play-in tournament matchups, and complete playoff bracket history on Scoard.",
};

export default function PlayoffsPage() {
  return (
    <Layout>
      <Header />
      <main className="w-full max-w-[1840px] mx-auto px-3 sm:px-6 lg:px-8 pb-10 sm:pb-12">
        <PlayoffsBracketView showTitle />
      </main>
    </Layout>
  );
}
