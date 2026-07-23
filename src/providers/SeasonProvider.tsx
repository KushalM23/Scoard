"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { CURRENT_SEASON } from "@/lib/teams";

interface SeasonContextType {
  season: string;
  setSeason: (season: string) => void;
  isDropdownDisabled: boolean;
  setIsDropdownDisabled: (disabled: boolean) => void;
  activeSeasonContext: string | null;
  setActiveSeasonContext: (season: string | null) => void;
}

const SeasonContext = createContext<SeasonContextType | undefined>(undefined);

export const SeasonProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [season, setSeason] = useState<string>(CURRENT_SEASON);
  const [isDropdownDisabled, setIsDropdownDisabled] = useState<boolean>(false);
  const [activeSeasonContext, setActiveSeasonContext] = useState<string | null>(null);

  const pathname = usePathname();

  useEffect(() => {
    setSeason(CURRENT_SEASON);
    setIsDropdownDisabled(false);
    setActiveSeasonContext(null);
  }, [pathname]);

  return (
    <SeasonContext.Provider
      value={{
        season,
        setSeason,
        isDropdownDisabled,
        setIsDropdownDisabled,
        activeSeasonContext,
        setActiveSeasonContext,
      }}
    >
      {children}
    </SeasonContext.Provider>
  );
};

export const useSeason = () => {
  const context = useContext(SeasonContext);
  if (!context) {
    throw new Error("useSeason must be used within a SeasonProvider");
  }
  return context;
};
