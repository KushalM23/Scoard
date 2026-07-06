// Enhanced headers for stats.nba.com
export const STATS_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.nba.com/",
  Origin: "https://www.nba.com",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-site",
  "Sec-Ch-Ua":
    '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
};

export const CDN_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.nba.com/",
  Origin: "https://www.nba.com",
};


// Cache durations (in seconds)
const CACHE_DURATIONS = {
  standings: 300, // 5 minutes
  roster: 1800, // 30 minutes
  gamelog: 300, // 5 minutes
  boxscore: 60, // 1 minute
  default: 300, // 5 minutes
};

const REQUEST_TIMEOUT_MS = 12000;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

// Determine cache duration based on endpoint
function getCacheDuration(endpoint: string): number {
  if (endpoint.includes("standings")) return CACHE_DURATIONS.standings;
  if (endpoint.includes("roster")) return CACHE_DURATIONS.roster;
  if (endpoint.includes("gamelog")) return CACHE_DURATIONS.gamelog;
  if (endpoint.includes("boxscore")) return CACHE_DURATIONS.boxscore;
  return CACHE_DURATIONS.default;
}

// Fetch from stats.nba.com with retry logic and caching
export async function fetchStatsApi(
  endpoint: string,
  params: Record<string, any> = {},
  maxRetries = 2,
  customCacheDuration?: number,
) {
  // Build URL with query params
  const url = new URL(`https://stats.nba.com/stats/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });

  const cacheDuration = customCacheDuration ?? getCacheDuration(endpoint);
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url.toString(), {
        headers: STATS_HEADERS,
        next: {
          revalidate: cacheDuration,
          tags: [`stats-${endpoint}`],
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        const httpError: any = new Error(
          `HTTP ${response.status}: ${response.statusText}`,
        );
        httpError.status = response.status;
        throw httpError;
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      lastError = error;
      console.error(
        `Attempt ${attempt}/${maxRetries} failed for ${endpoint}:`,
        error.message,
      );

      const status = error?.status;
      const shouldRetry =
        attempt < maxRetries &&
        (typeof status !== "number" || RETRYABLE_STATUS_CODES.has(status));

      if (shouldRetry) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
