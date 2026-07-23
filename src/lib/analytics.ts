"use client";

import { track } from "@vercel/analytics";

type AnalyticsPayload = Record<
  string,
  string | number | boolean | null | undefined
>;

export function trackEvent(eventName: string, payload: AnalyticsPayload = {}) {
  try {
    track(eventName, {
      ...payload,
      timestamp: Date.now(),
    });
  } catch (error) {
    // Analytics should never block UX.
    console.log("analytics event dropped", eventName, error);
  }
}
