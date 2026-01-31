/**
 * Request Coalescing Module
 * 
 * Prevents multiple simultaneous requests for the same resource from hitting the API.
 * This is also known as "thundering herd" protection.
 * 
 * Example: If 10 users request the same game at the same time, only 1 API call is made,
 * and all 10 users receive the same result.
 */

const pendingRequests = new Map<string, Promise<any>>();

/**
 * Executes a fetch function with request coalescing.
 * If a request for the same key is already in progress, returns the existing promise.
 * 
 * @param key - Unique identifier for the request (e.g., "game-0022600001")
 * @param fetchFn - Function that performs the actual fetch operation
 * @returns Promise that resolves with the fetched data
 */
export async function fetchWithCoalescing<T>(
    key: string,
    fetchFn: () => Promise<T>
): Promise<T> {
    // Check if a request for this key is already in progress
    if (pendingRequests.has(key)) {
        console.log(`[Coalescing] Reusing in-flight request for: ${key}`);
        return pendingRequests.get(key) as Promise<T>;
    }

    console.log(`[Coalescing] Starting new request for: ${key}`);

    // Create new request and store it
    const promise = fetchFn().finally(() => {
        // Clean up after the request completes (success or failure)
        pendingRequests.delete(key);
    });

    pendingRequests.set(key, promise);
    return promise;
}

/**
 * Get the number of currently pending requests (for monitoring)
 */
export function getPendingRequestCount(): number {
    return pendingRequests.size;
}

/**
 * Check if a request is currently pending
 */
export function isPending(key: string): boolean {
    return pendingRequests.has(key);
}
