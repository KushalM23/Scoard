import { Suspense } from "react";
import Loading from "@/components/ui/Loading";
import HomeScreen from "@/features/home/HomeScreen";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loading />
        </div>
      }
    >
      <HomeScreen />
    </Suspense>
  );
}
