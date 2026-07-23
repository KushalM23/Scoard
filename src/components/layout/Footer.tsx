"use client";

import React from "react";
import Link from "next/link";

const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-white/10 bg-background py-8 px-4 sm:px-6 lg:px-8 mt-auto relative z-10">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-1">
          <span className="font-mono text-xl tracking-wider text-primary font-bold">
            SCOARD!
          </span>
          <p className="text-xs text-text/60">
            See the game blind. Visualizing live NBA action, box scores, and playoff pictures.
          </p>
        </div>

        <div className="flex items-center gap-6 text-xs sm:text-sm font-display tracking-wider uppercase text-text/70">
          <Link href="/" className="hover:text-text transition-colors">
            Scores
          </Link>
          <Link href="/playoffs" className="hover:text-text transition-colors">
            Playoffs
          </Link>
        </div>

        <div className="flex flex-col items-center md:items-end gap-1 text-xs text-text/50">
          <p>Data provided by official NBA APIs.</p>
          <p>© {new Date().getFullYear()} Scoard. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
