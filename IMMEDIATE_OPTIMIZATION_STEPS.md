# Immediate Optimization Steps

This plan addresses the "Immediate Action Plan" to reduce server load and API calls.

## 1. Backend: Implement Request Coalescing
**Goal:** Prevent multiple simultaneous requests for the same game from hitting the NBA API (Thundering Herd protection).

- [ ] **Open `backend/src/server.ts`**.
- [ ] **Define Global Map**: Add `const pendingRequests = new Map<string, Promise<any>>();` near the top of the file.
- [ ] **Create Helper**: Implement `fetchWithCoalescing(key: string, fetchFn: () => Promise<any>)`:
    - Check if `key` exists in `pendingRequests`. If so, return it.
    - If not, `const promise = fetchFn();`
    - `pendingRequests.set(key, promise);`
    - Ensure the promise removes itself from the map upon completion (`.finally(() => pendingRequests.delete(key))`).
- [ ] **Apply to Endpoint**: Wrap the data fetching logic in `/api/games/:gameId` with this helper.

## 2. Backend: Adaptive Cache TTLs
**Goal:** Cache finished games for much longer (1 hour) than live games (5 seconds).

- [ ] **Open `backend/src/server.ts`**.
- [ ] **Define Constants**:
    ```typescript
    const TTL_LIVE = 5000;      // 5 seconds
    const TTL_SCHEDULED = 60000; // 1 minute (check for start)
    const TTL_FINAL = 3600000;   // 1 hour
    ```
- [ ] **Update Cache Helper**: Modify `setCachedData` to accept an optional `ttl` parameter (store `expiry` timestamp instead of just creation timestamp).
- [ ] **Update Retrieval**: Update `getCachedData` to check if `Date.now() > cached.expiry`.
- [ ] **Implement Logic**: In `/api/games/:gameId`, determines the TTL based on `gameStatus` (1, 2, or 3) and pass it to `setCachedData`.

## 3. Frontend: Visibility Awareness (Smart Polling)
**Goal:** Pause or slow down polling when the user minimizes the tab.

- [ ] **Open `frontend/src/pages/Game.tsx`**.
- [ ] **Update Polling Logic**: Inside the `fetchData` loop:
    - Check `if (document.hidden)`.
    - If hidden, either stop polling or increase `setTimeout` delay to 60+ seconds.
- [ ] **Add Event Listener**:
    - Add `document.addEventListener("visibilitychange", ...)` inside `useEffect`.
    - When `visibilityState` becomes `'visible'`, clear existing timeouts and verify/fetch data immediately.
