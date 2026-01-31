# SSE Implementation Plan (Next.js App Router)

This plan details how to switch from Client-Side Polling to Server-Sent Events (SSE) using Next.js App Router. The backend API route will act as an adapter, polling the NBA API once and broadcasting updates to all connected clients.

## Current Architecture

- **Framework**: Next.js 15 with App Router
- **Frontend**: React client component at `app/game/[gameId]/page.tsx`
- **API Routes**: Next.js API routes in `app/api/games/[gameId]/`
- **Current Polling**: Client-side `setTimeout` polling every 5s (live games) or 60s (scheduled games)
- **Data Sources**: 
  - CDN: `cdn.nba.com` for live/finished games
  - Stats API: Via proxy at `localhost:3001` for scheduled games
  - Play-by-play: CDN endpoint

## 1. Backend Implementation

### A. Create SSE Route Handler
- [ ] **Create File**: `app/api/games/[gameId]/stream/route.ts`
- [ ] **Export GET Handler**: Implement streaming response
  ```typescript
  import { NextRequest } from 'next/server';
  
  export const dynamic = 'force-dynamic';
  export const runtime = 'nodejs'; // Required for streaming
  
  export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ gameId: string }> }
  ) {
    const { gameId } = await params;
    
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Implementation here
      },
      cancel() {
        // Cleanup logic
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  }
  ```

### B. Data Structures & Polling Logic
- [ ] **Create Module-Level State** (outside handler):
  ```typescript
  // app/api/games/[gameId]/stream/route.ts
  
  type StreamController = ReadableStreamDefaultController<Uint8Array>;
  
  // Map<gameId, Set<StreamController>>
  const gameClients = new Map<string, Set<StreamController>>();
  
  // Map<gameId, { interval: NodeJS.Timeout, lastData: any }>
  const activePollers = new Map<string, { 
    interval: NodeJS.Timeout; 
    lastData: any;
    lastHash: string;
  }>();
  ```

### C. Broadcasting & Polling Functions
- [ ] **Implement `broadcast(gameId, data)` function**:
  ```typescript
  function broadcast(gameId: string, data: any) {
    const clients = gameClients.get(gameId);
    if (!clients || clients.size === 0) return;
    
    const encoder = new TextEncoder();
    const message = `data: ${JSON.stringify(data)}\n\n`;
    const encoded = encoder.encode(message);
    
    clients.forEach(controller => {
      try {
        controller.enqueue(encoded);
      } catch (error) {
        console.error('Failed to send to client:', error);
        clients.delete(controller);
      }
    });
  }
  ```

- [ ] **Implement `startPolling(gameId)` function**:
  - Reuse existing fetch logic from `app/api/games/[gameId]/route.ts`
  - Poll every 5 seconds for live games (status 2)
  - Poll every 60 seconds for scheduled games (status 1)
  - Stop polling for finished games (status 3)
  - **Optimization**: Hash the data and only broadcast if changed
  ```typescript
  async function startPolling(gameId: string) {
    if (activePollers.has(gameId)) return;
    
    const pollInterval = async () => {
      try {
        // Fetch from CDN or Stats API (copy logic from route.ts)
        const data = await fetchGameData(gameId);
        
        // Hash the data to detect changes
        const dataHash = hashData(data);
        const poller = activePollers.get(gameId);
        
        if (poller && poller.lastHash !== dataHash) {
          broadcast(gameId, data);
          poller.lastData = data;
          poller.lastHash = dataHash;
        }
        
        // Adjust polling rate based on game status
        if (data.gameStatus === 3) {
          stopPolling(gameId);
        }
      } catch (error) {
        console.error(`Polling error for game ${gameId}:`, error);
      }
    };
    
    // Initial fetch
    await pollInterval();
    
    // Start interval
    const interval = setInterval(pollInterval, 5000);
    activePollers.set(gameId, { 
      interval, 
      lastData: null, 
      lastHash: '' 
    });
  }
  ```

- [ ] **Implement `stopPolling(gameId)` function**:
  ```typescript
  function stopPolling(gameId: string) {
    const poller = activePollers.get(gameId);
    if (poller) {
      clearInterval(poller.interval);
      activePollers.delete(gameId);
    }
  }
  ```

### D. Client Connection Management
- [ ] **Register Client on Connection**:
  ```typescript
  // In ReadableStream start()
  if (!gameClients.has(gameId)) {
    gameClients.set(gameId, new Set());
  }
  gameClients.get(gameId)!.add(controller);
  
  // Send initial data immediately
  const poller = activePollers.get(gameId);
  if (poller?.lastData) {
    const encoder = new TextEncoder();
    controller.enqueue(
      encoder.encode(`data: ${JSON.stringify(poller.lastData)}\n\n`)
    );
  }
  
  // Start polling if not already active
  startPolling(gameId);
  ```

- [ ] **Handle Client Disconnect**:
  ```typescript
  // In ReadableStream cancel()
  const clients = gameClients.get(gameId);
  if (clients) {
    clients.delete(controller);
    
    // Stop polling if no clients left
    if (clients.size === 0) {
      gameClients.delete(gameId);
      stopPolling(gameId);
    }
  }
  ```

### E. Heartbeat Mechanism
- [ ] **Send Keepalive Comments**:
  ```typescript
  // Send comment every 30s to prevent timeout
  const heartbeat = setInterval(() => {
    const encoder = new TextEncoder();
    controller.enqueue(encoder.encode(': heartbeat\n\n'));
  }, 30000);
  
  // Clear in cancel()
  clearInterval(heartbeat);
  ```

## 2. Frontend Implementation

### A. Modify Game Page (`app/game/[gameId]/page.tsx`)

- [ ] **Remove Current Polling Logic**:
  - Remove the `setTimeout(fetchData, 5000)` and `setTimeout(fetchData, 60000)` calls
  - Keep the initial `fetchData()` call for immediate data display
  - Remove retry intervals

- [ ] **Add EventSource Hook**:
  ```typescript
  useEffect(() => {
    if (!gameId || !gameData) return;
    
    // Skip SSE for finished games
    if (gameData.gameStatus === 3) return;
    
    const eventSource = new EventSource(`/api/games/${gameId}/stream`);
    
    eventSource.onmessage = (event) => {
      try {
        const newData = JSON.parse(event.data);
        setGameData(newData);
        
        // Update related state
        if (newData.players) {
          setPlayers(newData.players);
        }
      } catch (error) {
        console.error('Failed to parse SSE data:', error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      eventSource.close();
      
      // Optional: Fallback to polling after SSE failure
      setTimeout(() => {
        setRetryTrigger(prev => prev + 1);
      }, 5000);
    };
    
    return () => {
      eventSource.close();
    };
  }, [gameId, gameData?.gameStatus]);
  ```

### B. Keep Initial Data Fetch
- [ ] **Preserve Initial Load**:
  - Keep the existing `useEffect` for the initial `fetchData()` call
  - This provides immediate data before SSE connects
  - Sets loading states and handles errors
  - Only activate SSE after initial data is loaded

### C. Handle Play-by-Play Updates
- [ ] **Decide on PBP Strategy**:
  - **Option A**: Include PBP in SSE stream (single connection)
  - **Option B**: Keep separate PBP polling (simpler, less bandwidth)
  - **Recommended**: Start with Option B, move to A if needed

## 3. Testing & Validation

### A. Development Testing
- [ ] **Test Single Client**: Open one game, verify SSE connection
- [ ] **Test Multiple Clients**: Open same game in multiple tabs
- [ ] **Test Network Tab**: Verify single backend poll per game
- [ ] **Test Disconnect**: Close tab, verify poller stops
- [ ] **Test Status Changes**: Verify polling stops for finished games

### B. Edge Cases
- [ ] **Connection Interruption**: Verify auto-reconnect
- [ ] **Invalid Game ID**: Handle gracefully with error response
- [ ] **Backend Restart**: Clients should reconnect automatically
- [ ] **CDN/API Failures**: Verify error handling and retry logic

## 4. Deployment Considerations

### A. Vercel Compatibility
- [ ] **Serverless Functions**: Note that Vercel has 60s timeout for Serverless Functions
- [ ] **Edge Runtime**: Consider using Edge Runtime for longer connections
- [ ] **Alternative**: Consider moving SSE to a dedicated long-running service (Railway, Render, etc.)

### B. Performance Monitoring
- [ ] **Track Connection Count**: Log active SSE connections
- [ ] **Monitor Memory Usage**: Ensure cleanup prevents memory leaks
- [ ] **API Rate Limits**: Monitor NBA API calls to stay within limits

## 5. Rollback Plan

If SSE causes issues, you can quickly rollback:
- [ ] Keep the SSE route but don't use it from frontend
- [ ] Re-enable the setTimeout polling in the Game component
- [ ] No database or schema changes needed
