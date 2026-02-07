'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Layout from './components/Layout';
import Header from './components/Header';
import Hero from './components/Hero';
import Loading from './components/Loading';

function HomeContent() {
    const router = useRouter();

    const handleGameSelect = (gameId: string) => {
        const searchParams = new URLSearchParams(window.location.search);
        const fromDate = searchParams.get('date');
        
        if (fromDate) {
            router.push(`/game/${gameId}?fromDate=${fromDate}`);
        } else {
            router.push(`/game/${gameId}`);
        }
    };

    return (
        <Layout>
            <Header />
            <Hero onGameSelect={handleGameSelect} />
        </Layout>
    );
}

export default function Home() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center min-h-screen">
                <Loading />
            </div>
        }>
            <HomeContent />
        </Suspense>
    );
}

