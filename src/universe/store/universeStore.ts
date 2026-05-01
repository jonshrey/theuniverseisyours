// src/universe/store/universeStore.ts
import { create } from 'zustand';
import type { CelestialEntity } from '../../lib/types';

interface UniverseState {
  // Sentiment & mood
  sentimentScore: number;
  isModelLoading: boolean;
  isProcessing: boolean;
  userInput: string;
  gravity: number;

  // Planets
  planetEntities: CelestialEntity[];

  // Highlight on mention
  highlightedPlanetIds: string[];

  // Selected planet for detail view
  selectedPlanetId: string | null;

  // Sentiment actions
  setSentimentScore: (score: number) => void;
  setModelLoading: (loading: boolean) => void;
  setProcessing: (processing: boolean) => void;
  setUserInput: (input: string) => void;
  resetSentiment: () => void;

  // Planet actions
  addOrUpdatePlanet: (planet: CelestialEntity) => void;
  removePlanet: (id: string) => void;

  // Highlight actions
  addHighlight: (planetId: string, duration?: number) => void;

  // Selection action
  setSelectedPlanetId: (id: string | null) => void;
}

const sentimentToGravity = (score: number): number => {
  const clamped = Math.max(-1, Math.min(1, score));
  return 100 + (clamped + 1) * 150;
};

export const useUniverseStore = create<UniverseState>((set, get) => ({
  sentimentScore: 0.0,
  isModelLoading: false,
  isProcessing: false,
  userInput: '',
  gravity: sentimentToGravity(0.0),
  planetEntities: [],
  highlightedPlanetIds: [],
  selectedPlanetId: null,

  setSentimentScore: (rawScore: number) => {
    const current = get().sentimentScore;
    const smoothed = current + 0.7 * (rawScore - current);
    const gravity = sentimentToGravity(smoothed);
    set({ sentimentScore: smoothed, gravity });
  },

  setModelLoading: (loading) => set({ isModelLoading: loading }),
  setProcessing: (processing) => set({ isProcessing: processing }),
  setUserInput: (input) => set({ userInput: input }),

  resetSentiment: () =>
    set({
      sentimentScore: 0.0,
      gravity: sentimentToGravity(0.0),
    }),

  addOrUpdatePlanet: (planet) =>
    set((state) => {
      const idx = state.planetEntities.findIndex((p) => p.id === planet.id);
      if (idx >= 0) {
        const updated = [...state.planetEntities];
        updated[idx] = planet;
        return { planetEntities: updated };
      }
      return { planetEntities: [...state.planetEntities, planet] };
    }),

  removePlanet: (id) =>
    set((state) => ({
      planetEntities: state.planetEntities.filter((p) => p.id !== id),
    })),

  addHighlight: (planetId, duration = 1200) => {
    set((state) => ({
      highlightedPlanetIds: [...state.highlightedPlanetIds, planetId],
    }));
    setTimeout(() => {
      set((state) => ({
        highlightedPlanetIds: state.highlightedPlanetIds.filter((id) => id !== planetId),
      }));
    }, duration);
  },

  setSelectedPlanetId: (id) => set({ selectedPlanetId: id }),
}));