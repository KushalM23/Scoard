# Immediate Optimization Steps

This plan addresses optimization to reduce server load and API calls for the Next.js App Router architecture.

## Current Architecture Status

- **Framework**: Next.js 15 with App Router
- **API Route**: `app/api/games/[gameId]/route.ts`
- **Caching Layer**: `app/lib/statsApi.ts` with Next.js `fetch` cache
- **Frontend Polling**: `setTimeout` based (5s live, 60s scheduled)
- **Adaptive Cache TTLs**: Already implemented (86400s finished, 1800s scheduled, 5s live)

## 1. Backend: Implement Request Coalescing
**Goal:** Prevent multiple simultaneous requests for the same game from hitting the NBA API (Thundering Herd protection).

**Status:** ⚠️ Not implemented - Multiple concurrent requests can hit the API

### Implementation Steps

- [ ] **Create Module**: Create `app/lib/requestCoalescing.ts`
- [ ] **Update API Route**: Modify `app/api/games/[gameId]/route.ts` to use coalescing
- [ ] **Benefits**: If 10 users request the same game simultaneously, only 1 NBA API call is made

## 2. Backend: Enhanced Caching Strategy
**Goal:** Optimize the existing cache implementation and add memory caching for frequently accessed data.

**Status:** Partially implemented - HTTP cache headers exist, but no in-memory cache

### Implementation Steps

- [ ] **Create In-Memory Cache**: Create `app/lib/memoryCache.ts` with TTL-based caching
- [ ] **Update API Route**: Add in-memory caching layer before NBA API calls

## 3. Frontend: Visibility Awareness (Smart Polling)
**Goal:** Pause or slow down polling when the user minimizes the tab or switches away.

**Status:** Not implemented - Polls continuously even when tab is hidden

### Implementation Steps

- [ ] **Update Game Page**: Modify `app/game/[gameId]/page.tsx`
  - Add visibility state tracking
  - Adjust polling intervals: Live 5s→30s, Scheduled 60s→5min when hidden
  - Fetch immediately when tab becomes visible again

## Expected Impact

| Optimization | Current | After | Improvement |
|-------------|---------|-------|-------------|
| Concurrent requests (10 users, same game) | 10 API calls | 1 API call | 90% reduction |
| Hidden tab polling (live game) | Every 5s | Every 30s | 83% reduction |
| Hidden tab polling (scheduled) | Every 60s | Every 5min | 80% reduction |
| Memory cache hits | 0% | ~60-80% | Faster responses |
