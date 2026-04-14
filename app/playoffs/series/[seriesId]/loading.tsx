import Header from "@/app/components/Header";
import Layout from "@/app/components/Layout";
import { Skeleton } from "@/app/components/skeleton";
import { ArrowLeft } from "lucide-react";

export default function PlayoffSeriesLoading() {
  return (
    <Layout>
      <Header />
      <main className="max-w-5xl mx-auto px-6 md:px-4 py-8 md:py-6">
        <div className="flex items-center gap-2 text-text/60 mb-6 md:mb-4 text-base md:text-sm">
          <ArrowLeft className="w-5 h-5 md:w-4 md:h-4" />
          <span>Back</span>
        </div>

        <div className="space-y-5">
          <Skeleton className="h-[220px] w-full rounded-2xl" />

          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
              <Skeleton className="h-[160px] w-full rounded-xl" />
              <Skeleton className="h-[160px] w-full rounded-xl" />
              <Skeleton className="h-[160px] w-full rounded-xl" />
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.04] p-4 md:p-5">
            <div className="grid grid-cols-2 gap-2 mb-4 rounded-lg bg-black/20 p-1">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>

            <Skeleton className="h-[240px] w-full rounded-xl" />
          </div>
        </div>
      </main>
    </Layout>
  );
}
