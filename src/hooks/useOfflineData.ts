import { useState, useEffect, useCallback } from 'react';
import { TourCache, SyncQueue, Connectivity, SyncManager } from '../utils/offlineDB';
import { apiClient } from '../api/tourLeaderApi';

interface UseOfflineDataOptions<T> {
  cacheKey: string;
  fetchFn: () => Promise<T>;
  staleTime?: number; // Time in ms before data is considered stale (default: 5 minutes)
}

interface UseOfflineDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  isStale: boolean;
  isOffline: boolean;
  refetch: () => Promise<void>;
  syncQueue: number;
}

/**
 * Hook for offline-first data fetching with IndexedDB caching
 */
export function useOfflineData<T>({
  cacheKey,
  fetchFn,
  staleTime = 5 * 60 * 1000, // 5 minutes default
}: UseOfflineDataOptions<T>): UseOfflineDataReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [isOffline, setIsOffline] = useState(!Connectivity.isOnline());
  const [syncQueue, setSyncQueue] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Try to fetch from network first
      if (Connectivity.isOnline()) {
        const freshData = await fetchFn();
        
        // Cache the fresh data
        await TourCache.save(cacheKey, freshData);
        
        setData(freshData);
        setIsStale(false);
        setIsOffline(false);
      } else {
        // Offline - try to load from cache
        const cached = await TourCache.getWithTimestamp(cacheKey);
        
        if (cached) {
          setData(cached.data);
          const age = Date.now() - cached.timestamp;
          setIsStale(age > staleTime);
          setIsOffline(true);
        } else {
          setError(new Error('No cached data available and offline'));
          setIsOffline(true);
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
      
      // On error, try to load from cache
      const cached = await TourCache.getWithTimestamp(cacheKey);
      
      if (cached) {
        setData(cached.data);
        const age = Date.now() - cached.timestamp;
        setIsStale(age > staleTime);
        setError(err as Error);
      } else {
        setError(err as Error);
      }
    } finally {
      setLoading(false);
    }
  }, [cacheKey, fetchFn, staleTime]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for connectivity changes
  useEffect(() => {
    const unsubscribeOnline = Connectivity.onOnline(() => {
      setIsOffline(false);
      // Refetch when coming back online
      fetchData();
    });

    const unsubscribeOffline = Connectivity.onOffline(() => {
      setIsOffline(true);
    });

    return () => {
      unsubscribeOnline();
      unsubscribeOffline();
    };
  }, [fetchData]);

  // Update sync queue count periodically
  useEffect(() => {
    const updateQueue = async () => {
      const stats = await SyncQueue.getStats();
      setSyncQueue(stats.total);
    };

    updateQueue();
    const interval = setInterval(updateQueue, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    data,
    loading,
    error,
    isStale,
    isOffline,
    refetch: fetchData,
    syncQueue,
  };
}

/**
 * Hook for offline-first mutations with sync queue
 */
interface UseOfflineMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  endpoint: string;
  method?: 'POST' | 'PUT';
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
}

interface UseOfflineMutationReturn<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<void>;
  loading: boolean;
  error: Error | null;
  queued: boolean;
}

export function useOfflineMutation<TData, TVariables>({
  mutationFn,
  endpoint,
  method = 'POST',
  onSuccess,
  onError,
}: UseOfflineMutationOptions<TData, TVariables>): UseOfflineMutationReturn<TData, TVariables> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [queued, setQueued] = useState(false);

  const mutate = useCallback(async (variables: TVariables) => {
    setLoading(true);
    setError(null);
    setQueued(false);

    try {
      if (Connectivity.isOnline()) {
        // Online - execute mutation immediately
        const data = await mutationFn(variables);
        onSuccess?.(data);
      } else {
        // Offline - queue the mutation
        await SyncQueue.add(endpoint, method, variables);
        setQueued(true);
        console.log('Action queued for sync when online');
      }
    } catch (err) {
      console.error('Mutation error:', err);
      
      // On error, queue for retry
      try {
        await SyncQueue.add(endpoint, method, variables);
        setQueued(true);
        console.log('Action queued for retry');
      } catch (queueError) {
        setError(queueError as Error);
        onError?.(queueError as Error);
      }
      
      setError(err as Error);
      onError?.(err as Error);
    } finally {
      setLoading(false);
    }
  }, [mutationFn, endpoint, method, onSuccess, onError]);

  return {
    mutate,
    loading,
    error,
    queued,
  };
}

/**
 * Hook for managing sync queue
 */
export function useSyncQueue() {
  const [stats, setStats] = useState({ pending: 0, failed: 0, total: 0 });
  const [syncing, setSyncing] = useState(false);

  const refreshStats = useCallback(async () => {
    const newStats = await SyncQueue.getStats();
    setStats(newStats);
  }, []);

  const syncNow = useCallback(async () => {
    if (!Connectivity.isOnline()) {
      console.log('Cannot sync while offline');
      return;
    }

    setSyncing(true);
    try {
      const result = await SyncManager.processQueue();
      console.log(`Sync completed: ${result.success} success, ${result.failed} failed`);
      await refreshStats();
      return result;
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    } finally {
      setSyncing(false);
    }
  }, [refreshStats]);

  useEffect(() => {
    refreshStats();

    // Auto-sync when coming online
    const unsubscribe = Connectivity.onOnline(() => {
      syncNow();
    });

    return () => unsubscribe();
  }, [refreshStats, syncNow]);

  return {
    stats,
    syncing,
    syncNow,
    refreshStats,
  };
}
