"use client";

import React, { createContext, useContext } from "react";
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
  const noopSetSeason = (_season: string) => {};
  const noopSetDropdownDisabled = (_disabled: boolean) => {};
  const noopSetActiveSeasonContext = (_season: string | null) => {};

  return (
    <SeasonContext.Provider
      value={{
        season: CURRENT_SEASON,
        setSeason: noopSetSeason,
        isDropdownDisabled: false,
        setIsDropdownDisabled: noopSetDropdownDisabled,
        activeSeasonContext: null,
        setActiveSeasonContext: noopSetActiveSeasonContext,
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
