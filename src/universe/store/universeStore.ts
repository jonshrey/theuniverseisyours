// src/universe/store/universeStore.ts
import { create } from 'zustand';

interface UniverseState {
    // State values
    sentimentScore: number;          // -1.0 to 1.0
    isModelLoading: boolean;
    isProcessing: boolean;
    userInput: string;
    
    // Derived value (optional, can compute in component)
    gravity: number;                 // mapped from sentiment
    
    // Actions
    setSentimentScore: (score: number) => void;
    setModelLoading: (loading: boolean) => void;
    setProcessing: (processing: boolean) => void;
    setUserInput: (input: string) => void;
    resetSentiment: () => void;
}

// Helper to map sentiment (-1..1) to G (30..500)
const sentimentToGravity = (score: number): number => {
    const clamped = Math.max(-1, Math.min(1, score));
    return 30 + (clamped + 1) * 235;
};

export const useUniverseStore = create<UniverseState>((set) => ({
    // Initial state
    sentimentScore: 0.0,
    isModelLoading: false,
    isProcessing: false,
    userInput: '',
    gravity: sentimentToGravity(0.0), // 265 (neutral)
    
    // Actions
    setSentimentScore: (score) => set({
        sentimentScore: score,
        gravity: sentimentToGravity(score),
    }),
    
    setModelLoading: (loading) => set({ isModelLoading: loading }),
    
    setProcessing: (processing) => set({ isProcessing: processing }),
    
    setUserInput: (input) => set({ userInput: input }),
    
    resetSentiment: () => set({
        sentimentScore: 0.0,
        gravity: sentimentToGravity(0.0),
    }),
}));