import { create } from 'zustand';

export type SortType = 'rating' | 'deliveryTime' | 'distance' | 'newest';

interface FilterState {
  activeSort: SortType;
  activeMinRating: number | null;
  activeOffers: boolean;
  activeNearAndFast: boolean;
  activeNoPackaging: boolean;
  activeCuisine: string | null;
  
  setActiveSort: (sort: SortType) => void;
  setActiveMinRating: (rating: number | null) => void;
  setActiveOffers: (offers: boolean) => void;
  setActiveNearAndFast: (nearAndFast: boolean) => void;
  setActiveNoPackaging: (noPackaging: boolean) => void;
  setActiveCuisine: (cuisine: string | null) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  activeSort: 'rating',
  activeMinRating: null,
  activeOffers: false,
  activeNearAndFast: false,
  activeNoPackaging: false,
  activeCuisine: null,

  setActiveSort: (sort) => set({ activeSort: sort }),
  setActiveMinRating: (rating) => set({ activeMinRating: rating }),
  setActiveOffers: (offers) => set({ activeOffers: offers }),
  setActiveNearAndFast: (nearAndFast) => set({ activeNearAndFast: nearAndFast }),
  setActiveNoPackaging: (noPackaging) => set({ activeNoPackaging: noPackaging }),
  setActiveCuisine: (cuisine) => set({ activeCuisine: cuisine }),
  resetFilters: () => set({
    activeSort: 'rating',
    activeMinRating: null,
    activeOffers: false,
    activeNearAndFast: false,
    activeNoPackaging: false,
    activeCuisine: null,
  }),
}));
