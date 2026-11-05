"use client";

import { useEffect, useState } from "react";

export function useLocalGameTime(dateString: string) {
  const [time, setTime] = useState("--");

  useEffect(() => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      setTime("--");
      return;
    }

    setTime(
      new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }).format(date),
    );
  }, [dateString]);

  return time;
}
