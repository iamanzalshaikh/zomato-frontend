import { create } from 'zustand';

type FavoritesState = {
  ids: Set<string>;
  setFromList: (restaurants: any[]) => void;
  toggleLocal: (restaurantId: string) => void;
};

export const useFavoritesStore = create<FavoritesState>((set) => ({
  ids: new Set(),
  setFromList: (restaurants) =>
    set(() => ({
      ids: new Set((restaurants ?? []).map((r: any) => String(r?._id ?? r?.id ?? ''))),
    })),
  toggleLocal: (restaurantId) =>
    set((state) => {
      const next = new Set(state.ids);
      if (next.has(restaurantId)) next.delete(restaurantId);
      else next.add(restaurantId);
      return { ids: next };
    }),
}));

