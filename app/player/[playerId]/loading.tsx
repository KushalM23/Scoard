import Header from "@/app/components/Header";
import Layout from "@/app/components/Layout";
import Loading from "@/app/components/Loading";

export default function PlayerLoading() {
  return (
    <Layout>
      <Header />
      <div className="flex justify-center items-center h-[calc(100vh-80px)]">
        <Loading text="Loading player page..." />
      </div>
    </Layout>
  );
}
