# API Optimization Strategy for High-Traffic Live Games

To handle high traffic during live games without overloading the server or hitting external API rate limits, we can implement a multi-layered optimization strategy.

## 1. Backend Request Coalescing (Stampede Protection)
Currently, if 100 users request the same game data simultaneously, the server might try to trigger 100 calls to the NBA API. Request coalescing ensures that for a specific resource (e.g., `GameID: 12345`), only **one** external request is in flight at a time. All concurrent requests wait for that single result.

**Implementation:**
- Maintain a map of `pendingRequests`.
- Before fetching, check if a promise for that `gameId` already exists.
- If yes, return the existing promise.
- If no, create the promise, store it, and delete it after resolution.

## 2. Adaptive Caching Strategies
We should employ different cache Time-To-Live (TTL) values based on game status.

**Strategy:**
- **Live Games:** Short TTL (e.g., 5-10 seconds). This acts as a micro-cache to absorb traffic spikes while keeping data fresh.
- **Scheduled/Finished Games:** Long TTL (e.g., 5-60 minutes). No need to re-fetch finished game data frequently.
- **Error States:** Short TTL (e.g., 30 seconds) to prevent caching transient errors for too long.

## 3. Client-Side "Smart" Polling
The frontend is currently driving the load. We can make the client smarter about when and how it asks for data.

**Techniques:**
- **Page Visibility API:** Stop or significantly slow down polling when the user switches tabs or minimizes the browser (`document.hidden`).
- **Adaptive Intervals:**
    - Live: Poll every 10s.
    - Halftime/Breaks: Poll every 30s.
    - Finished: Stop polling.
- **Jitter:** Add a random delay (e.g., +/- 1000ms) to the polling interval. This prevents the "Thundering Herd" problem where all clients connected at the same time send requests at the exact same second.

## 4. Server-Sent Events (SSE) or WebSockets
Instead of thousands of clients asking "Is there new data?" every 5 seconds (Polling), functionality can initiate a "Push" model.

**Recommendation: Server-Sent Events (SSE)**
SSE is simpler than WebSockets and perfect for this one-way data flow (Server -> Client).
- **How it works:** Client opens a single persistent connection. The server pushes a message only when the game score actually changes.
- **Impact:** drastically reduces HTTP overhead and request volume.

## 5. Conditional Requests (ETags)
Use HTTP `ETag` or `Last-Modified` headers.
1. The server sends an `ETag` (hash of the data) with the response.
2. The client sends `If-None-Match: "hash"` in the next request.
3. If data hasn't changed, the server returns `304 Not Modified` (empty body).
**Benefit:** Saves bandwidth and processing time, though the server still has to check the data correctness (which might still require an upstream call unless combined with caching).

## 6. Rate Limiting
Protect the backend from abuse or runaway scripts.
- Use `express-rate-limit` to limit IP addresses to a reasonable number of requests per minute (e.g., 60 requests/min).

---

## Recommended Immediate Action Plan

1. **Implement Backend Request Coalescing**: This is the highest impact change for "thundering herd" protection internally.
2. **Refine Cache TTLs**: Ensure `finished` games are cached for ~1 hour, separate from `live` games.
3. **Frontend Visibility Check**: Update `useEffect` loops in React to pause when `document.hidden` is true.
