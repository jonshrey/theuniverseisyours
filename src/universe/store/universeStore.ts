import { create } from 'zustand';
import type { CelestialEntity } from '../../lib/types';

interface UniverseState {
  // Existing
  sentimentScore: number;
  isModelLoading: boolean;
  isProcessing: boolean;
  userInput: string;
  gravity: number;

  // New
  planetEntities: CelestialEntity[];

  // Existing actions
  setSentimentScore: (score: number) => void;
  setModelLoading: (loading: boolean) => void;
  setProcessing: (processing: boolean) => void;
  setUserInput: (input: string) => void;
  resetSentiment: () => void;

  // New actions
  addOrUpdatePlanet: (planet: CelestialEntity) => void;
  removePlanet: (id: string) => void;
}

const sentimentToGravity = (score: number): number => {
  const clamped = Math.max(-1, Math.min(1, score));
  return 100 + (clamped + 1) * 150; // 100 (-1) → 400 (+1)
};

export const useUniverseStore = create<UniverseState>((set, get) => ({
  // ---------- Initial state ----------
  sentimentScore: 0.0,
  isModelLoading: false,
  isProcessing: false,
  userInput: '',
  gravity: sentimentToGravity(0.0), // 250 – neutral
  planetEntities: [],

  // ---------- Sentiment ----------
  setSentimentScore: (rawScore: number) => {
    const current = get().sentimentScore;
    const smoothed = current + 0.3 * (rawScore - current);
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

  // ---------- Planets ----------
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
}));