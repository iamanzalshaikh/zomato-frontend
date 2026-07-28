import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'case_recently_viewed_stores_v1';
const MAX_ITEMS = 12;

export type RecentlyViewedStore = {
  id: string;
  restaurantName: string;
  logo?: string | null;
  bannerImage?: string | null;
  averageRating?: number | null;
  averageDeliveryTime?: number | null;
  businessType?: string | null;
};

let memoryCache: RecentlyViewedStore[] | null = null;
let hydratePromise: Promise<RecentlyViewedStore[]> | null = null;

async function hydrate(): Promise<RecentlyViewedStore[]> {
  if (memoryCache) return memoryCache;
  if (!hydratePromise) {
    hydratePromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (!raw) {
          memoryCache = [];
          return memoryCache;
        }
        const parsed = JSON.parse(raw) as RecentlyViewedStore[];
        memoryCache = Array.isArray(parsed) ? parsed : [];
        return memoryCache;
      } catch {
        memoryCache = [];
        return memoryCache;
      } finally {
        hydratePromise = null;
      }
    })();
  }
  return hydratePromise;
}

export async function getRecentlyViewedStores(): Promise<RecentlyViewedStore[]> {
  return hydrate();
}

export async function pushRecentlyViewedStore(store: RecentlyViewedStore): Promise<void> {
  try {
    if (!store.id) return;
    const existing = await hydrate();
    const next = [store, ...existing.filter((x) => x.id !== store.id)].slice(0, MAX_ITEMS);
    memoryCache = next;
    void AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Non-critical persistence; ignore storage failures.
  }
}
