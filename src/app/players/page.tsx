import Header from "@/components/layout/Header";
import Layout from "@/components/layout/AppShell";
import PlayersPage from "@/features/players/PlayersPage";

export default function Players(){
    return (
        <Layout>
            <Header />
            <PlayersPage />
        </Layout>
    )
}
