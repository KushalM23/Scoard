import Header from "@/app/components/Header";
import Layout from "@/app/components/Layout";
import { Skeleton } from "@/app/components/skeleton";

export default function PlayoffSeriesLoading() {
  return (
    <Layout>
      <Header />
      <main className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pb-12 space-y-5">
        <Skeleton className="h-[220px] w-full rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-[142px] w-full rounded-2xl" />
          <Skeleton className="h-[142px] w-full rounded-2xl" />
        </div>
        <Skeleton className="h-[580px] w-full rounded-2xl" />
      </main>
    </Layout>
  );
}
