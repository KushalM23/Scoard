import Header from "@/app/components/Header";
import Layout from "@/app/components/Layout";
import { Skeleton } from "@/app/components/skeleton";

export default function PlayoffsLoading() {
  return (
    <Layout>
      <Header />
      <main className="w-full max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-8 pb-12 space-y-6">
        <Skeleton className="h-[148px] w-full rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Skeleton className="h-[418px] w-full rounded-2xl" />
          <Skeleton className="h-[418px] w-full rounded-2xl" />
        </div>
        <Skeleton className="h-[760px] w-full rounded-2xl" />
      </main>
    </Layout>
  );
}
