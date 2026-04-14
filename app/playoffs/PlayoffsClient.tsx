"use client";

import Header from "@/app/components/Header";
import Layout from "@/app/components/Layout";
import PlayoffsBracketView from "@/app/components/PlayoffsBracketView";

export default function PlayoffsClient() {
  return (
    <Layout>
      <Header />
      <main className="w-full max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <PlayoffsBracketView showTitle />
      </main>
    </Layout>
  );
}
