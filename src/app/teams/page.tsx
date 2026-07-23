import Header from "@/components/layout/Header";
import Layout from "@/components/layout/AppShell";
import TeamsGrid from "@/features/teams/TeamsGrid";

export default function Teams(){
    return (
        <Layout>
            <Header />
            <TeamsGrid />
        </Layout>
    )
}