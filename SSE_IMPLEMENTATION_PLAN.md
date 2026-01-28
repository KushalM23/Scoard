# SSE Implementation Plan (Adapter Pattern)

This plan details how to switch from Client-Side Polling to Server-Sent Events (SSE). The Backend will act as an adapter, polling the NBA API once and broadcasting updates to all connected clients.

## 1. Backend Implementation (`server.ts`)

### A. Data Structures
- [ ] **Create Client Store**: Define a global structure to hold active connections.
  ```typescript
  // Map<gameId, Set<ResponseObject>>
  const gameClients = new Map<string, Set<express.Response>>();
  // Map<gameId, IntervalId> to track active polling loops
  const activePollers = new Map<string, NodeJS.Timeout>();
  ```

### B. Setup SSE Endpoint
- [ ] **Create Route**: `GET /api/games/:gameId/stream`
- [ ] **Set Headers**:
  - `Content-Type: text/event-stream`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`
- [ ] **Register Client**: Add `res` to `gameClients.get(gameId)`.
- [ ] **Handle Disconnect**: Listen for `req.on('close')`. Remove client from Set. If Set is empty, stop the poller.

### C. Evaluation & Broadcasting Logic
- [ ] **Create `broadcast(gameId, data)` function**:
  - Iterate over all clients in `gameClients.get(gameId)`.
  - Send data: `client.write('data: ' + JSON.stringify(data) + '\n\n');`
- [ ] **Create `startPolling(gameId)` function**:
  - Check if poller already exists. If yes, ignore.
  - Set `setInterval` (e.g., every 5s).
  - Fetch data from NBA (reuse existing logic).
  - **Optimization**: Store `lastDataHash` or `lastTimestamp`. Only broadcast if data has changed.

## 2. Frontend Implementation (`frontend/src/pages/Game.tsx`)

### A. Remove Old Polling
- [ ] **Delete**: Remove the recursive `setTimeout` logic inside the main `useEffect`.
- [ ] **Keep**: Retain the initial fetch on mount to ensure immediate data display (skeleton state handling).

### B. Add EventSource
- [ ] **Initialize**:
  ```typescript
  const eventSource = new EventSource(`${API_URL}/api/games/${gameId}/stream`);
  ```
- [ ] **Handle Messages**:
  ```typescript
  eventSource.onmessage = (event) => {
      const newData = JSON.parse(event.data);
      setGameData(newData);
  };
  ```
- [ ] **Cleanup**: Ensure `eventSource.close()` is called in the `useEffect` cleanup function.

## 3. Fallback & Stability (Optional but recommended)
- [ ] **Heartbeat**: Send a comment lines (`: ping\n\n`) every 30s to keep the connection alive through load balancers.
- [ ] **Reconnection**: `EventSource` handles this automatically, but ensure the backend handles re-connecting clients gracefully (sending the latest cached state immediately).
