import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import Header from '../components/Header';
import Hero from '../components/Hero';

const Home: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const handleGameSelect = (gameId: string) => {
        // Pass the current date to the game page so we can return to it
        const currentDate = searchParams.get('date');
        if (currentDate) {
            navigate(`/game/${gameId}?fromDate=${currentDate}`);
        } else {
            navigate(`/game/${gameId}`);
        }
    };

    return (
        <Layout>
            <Header />
            <Hero onGameSelect={handleGameSelect} />
        </Layout>
    );
};

export default Home;
