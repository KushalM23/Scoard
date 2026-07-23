import React from 'react';
import Footer from './Footer';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen flex flex-col bg-background text-text font-sans relative overflow-x-hidden">
            {/* Background Elements */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                {/* Gradient removed */}
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1">
                {children}
            </div>
            <Footer />
        </div>
    );
};

export default Layout;
