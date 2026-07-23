import React from 'react';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen flex flex-col bg-background text-text font-sans relative overflow-x-hidden">
            <div className="fixed inset-0 z-0 pointer-events-none">
            </div>

            <div className="relative z-10 flex-1">
                {children}
            </div>
        </div>
    );
};

export default Layout;
