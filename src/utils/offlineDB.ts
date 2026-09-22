import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Define the database schema
interface PailaDB extends DBSchema {
  tour_cache: {
    key: string;
    value: {
      id: string;
      data: any;
      timestamp: number;
    };
    indexes: { 'by-timestamp': number };
  };
  sync_queue: {
    key: number;
    value: {
      id?: number;
      endpoint: string;
      method: 'POST' | 'PUT';
      payload: any;
      timestamp: number;
      retryCount: number;
      status: 'PENDING' | 'SYNCING' | 'FAILED';
    };
    indexes: { 'by-status': string; 'by-timestamp': number };
  };
}

const DB_NAME = 'paila-nepal-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<PailaDB> | null = null;

/**
 * Initialize and get the database instance
 */
export async function getDB(): Promise<IDBPDatabase<PailaDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<PailaDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create tour_cache store
      if (!db.objectStoreNames.contains('tour_cache')) {
        const tourStore = db.createObjectStore('tour_cache', { keyPath: 'id' });
        tourStore.createIndex('by-timestamp', 'timestamp');
      }

      // Create sync_queue store
      if (!db.objectStoreNames.contains('sync_queue')) {
        const syncStore = db.createObjectStore('sync_queue', {
          keyPath: 'id',
          autoIncrement: true,
        });
        syncStore.createIndex('by-status', 'status');
        syncStore.createIndex('by-timestamp', 'timestamp');
      }
    },
  });

  return dbInstance;
}

/**
 * Tour Cache Operations
 */
export const TourCache = {
  /**
   * Save tour data to cache
   */
  async save(tourId: string, data: any): Promise<void> {
    const db = await getDB();
    await db.put('tour_cache', {
      id: tourId,
      data,
      timestamp: Date.now(),
    });
  },

  /**
   * Get tour data from cache
   */
  async get(tourId: string): Promise<any | null> {
    const db = await getDB();
    const result = await db.get('tour_cache', tourId);
    return result?.data || null;
  },

  /**
   * Get tour data with timestamp
   */
  async getWithTimestamp(tourId: string): Promise<{ data: any; timestamp: number } | null> {
    const db = await getDB();
    const result = await db.get('tour_cache', tourId);
    if (!result) return null;
    return { data: result.data, timestamp: result.timestamp };
  },

  /**
   * Delete tour from cache
   */
  async delete(tourId: string): Promise<void> {
    const db = await getDB();
    await db.delete('tour_cache', tourId);
  },

  /**
   * Clear all tour cache
   */
  async clear(): Promise<void> {
    const db = await getDB();
    await db.clear('tour_cache');
  },
};

/**
 * Sync Queue Operations
 */
export const SyncQueue = {
  /**
   * Add action to sync queue
   */
  async add(endpoint: string, method: 'POST' | 'PUT', payload: any): Promise<number> {
    const db = await getDB();
    const id = await db.add('sync_queue', {
      endpoint,
      method,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'PENDING',
    });
    return id as number;
  },

  /**
   * Get all pending actions
   */
  async getPending(): Promise<any[]> {
    const db = await getDB();
    return await db.getAllFromIndex('sync_queue', 'by-status', 'PENDING');
  },

  /**
   * Get all failed actions
   */
  async getFailed(): Promise<any[]> {
    const db = await getDB();
    return await db.getAllFromIndex('sync_queue', 'by-status', 'FAILED');
  },

  /**
   * Update action status
   */
  async updateStatus(id: number, status: 'PENDING' | 'SYNCING' | 'FAILED'): Promise<void> {
    const db = await getDB();
    const action = await db.get('sync_queue', id);
    if (action) {
      action.status = status;
      if (status === 'SYNCING' || status === 'FAILED') {
        action.retryCount += 1;
      }
      await db.put('sync_queue', action);
    }
  },

  /**
   * Delete action from queue
   */
  async delete(id: number): Promise<void> {
    const db = await getDB();
    await db.delete('sync_queue', id);
  },

  /**
   * Clear all actions from queue
   */
  async clear(): Promise<void> {
    const db = await getDB();
    await db.clear('sync_queue');
  },

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{ pending: number; failed: number; total: number }> {
    const db = await getDB();
    const pending = await db.countFromIndex('sync_queue', 'by-status', 'PENDING');
    const failed = await db.countFromIndex('sync_queue', 'by-status', 'FAILED');
    return {
      pending,
      failed,
      total: pending + failed,
    };
  },
};

/**
 * Connectivity Detection
 */
export const Connectivity = {
  /**
   * Check if online
   */
  isOnline(): boolean {
    return navigator.onLine;
  },

  /**
   * Add online event listener
   */
  onOnline(callback: () => void): () => void {
    window.addEventListener('online', callback);
    return () => window.removeEventListener('online', callback);
  },

  /**
   * Add offline event listener
   */
  onOffline(callback: () => void): () => void {
    window.addEventListener('offline', callback);
    return () => window.removeEventListener('offline', callback);
  },
};

/**
 * Sync Manager - Handles background synchronization
 */
export const SyncManager = {
  /**
   * Process all pending sync actions
   */
  async processQueue(): Promise<{ success: number; failed: number }> {
    const pending = await SyncQueue.getPending();
    let success = 0;
    let failed = 0;

    for (const action of pending) {
      try {
        await SyncQueue.updateStatus(action.id, 'SYNCING');

        const token = localStorage.getItem('auth_token');
        const response = await fetch(action.endpoint, {
          method: action.method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(action.payload),
        });

        if (response.ok) {
          await SyncQueue.delete(action.id);
          success++;
        } else {
          await SyncQueue.updateStatus(action.id, 'FAILED');
          failed++;
        }
      } catch (error) {
        console.error('Sync failed for action:', action, error);
        await SyncQueue.updateStatus(action.id, 'FAILED');
        failed++;
      }
    }

    return { success, failed };
  },

  /**
   * Register background sync (if supported)
   */
  async registerBackgroundSync(): Promise<void> {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register('sync-queue');
        console.log('Background sync registered');
      } catch (error) {
        console.log('Background sync not supported or failed:', error);
      }
    }
  },
};

/**
 * Initialize offline support
 */
export async function initializeOfflineSupport(): Promise<void> {
  // Initialize database
  await getDB();

  // Register service worker for background sync
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Listen for sync events
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_COMPLETE') {
          console.log('Background sync completed:', event.data);
        }
      });
    } catch (error) {
      console.error('Service worker initialization failed:', error);
    }
  }

  // Listen for connectivity changes
  Connectivity.onOnline(async () => {
    console.log('Connection restored, processing sync queue...');
    const result = await SyncManager.processQueue();
    console.log(`Sync completed: ${result.success} success, ${result.failed} failed`);
  });
}
