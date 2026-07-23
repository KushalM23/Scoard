import Header from "@/components/layout/Header";
import Layout from "@/components/layout/AppShell";
import Loading from "@/components/ui/Loading";

interface PageLoadingShellProps {
  text: string;
}

export default function PageLoadingShell({ text }: PageLoadingShellProps) {
  return (
    <Layout>
      <Header />
      <div className="flex justify-center items-center h-[calc(100vh-80px)]">
        <Loading text={text} />
      </div>
    </Layout>
  );
}
