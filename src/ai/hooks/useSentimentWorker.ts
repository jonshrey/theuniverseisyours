// src/ai/hooks/useSentimentWorker.ts
import { useEffect, useRef, useCallback } from 'react';
import { useUniverseStore } from '../../universe/store/universeStore';
import SentimentWorker from '../worker/sentiment.worker?worker';

// Message types
interface WorkerMessage {
  type: 'LOAD_MODEL' | 'ANALYZE';
  payload?: { text: string };
}

interface WorkerResponse {
  type: 'LOADING_PROGRESS' | 'MODEL_LOADED' | 'ANALYSIS_RESULT' | 'ERROR';
  payload?: { progress?: number; score?: number; message?: string };
}

export function useSentimentWorker() {
  const workerRef = useRef<Worker | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Actions – stable references from Zustand
  const setModelLoading = useUniverseStore((state) => state.setModelLoading);
  const setProcessing = useUniverseStore((state) => state.setProcessing);
  const setSentimentScore = useUniverseStore((state) => state.setSentimentScore);

  // Create worker only once
  useEffect(() => {
    if (workerRef.current) return; // already created

    const worker = new SentimentWorker();
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { type, payload } = event.data;

      switch (type) {
        case 'LOADING_PROGRESS':
          // Only update if not already loading (prevents unnecessary renders)
          if (!useUniverseStore.getState().isModelLoading) {
            setModelLoading(true);
          }
          break;

        case 'MODEL_LOADED':
          if (useUniverseStore.getState().isModelLoading) {
            setModelLoading(false);
          }
          break;

        case 'ANALYSIS_RESULT':
          if (payload?.score !== undefined) {
            setSentimentScore(payload.score);
          }
          setProcessing(false);
          break;

        case 'ERROR':
          console.error('Worker error:', payload?.message);
          setProcessing(false);
          if (useUniverseStore.getState().isModelLoading) {
            setModelLoading(false);
          }
          break;
      }
    };

    // Start loading the model
    worker.postMessage({ type: 'LOAD_MODEL' } as WorkerMessage);

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced analysis function
  const analyze = useCallback((text: string) => {
    if (!workerRef.current) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      if (workerRef.current && text.trim().length > 0) {
        setProcessing(true);
        workerRef.current.postMessage({
          type: 'ANALYZE',
          payload: { text: text.trim() },
        } as WorkerMessage);
      }
    }, 800);
  }, [setProcessing]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return { analyze };
}