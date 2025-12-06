import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Header from '../components/Header';
import Hero from '../components/Hero';

const Home: React.FC = () => {
    const navigate = useNavigate();

    const handleGameSelect = (gameId: string) => {
        navigate(`/game/${gameId}`);
    };

    return (
        <Layout>
            <Header />
            <Hero onGameSelect={handleGameSelect} />
        </Layout>
    );
};

export default Home;
