// src/ai/hooks/useSentimentWorker.ts
import { useEffect, useRef, useCallback } from 'react';
import { useUniverseStore } from '../../universe/store/universeStore';

// Vite worker import – tells Vite to bundle this as a Web Worker
import SentimentWorker from '../worker/sentiment.worker?worker';

// Message types (should match the worker)
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

  const {
    setModelLoading,
    setProcessing,
    setSentimentScore,
  } = useUniverseStore();

  // Initialize worker on mount
  useEffect(() => {
    const worker = new SentimentWorker();
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { type, payload } = event.data;

      switch (type) {
        case 'LOADING_PROGRESS':
          setModelLoading(true);
          // Optionally store progress if needed
          break;

        case 'MODEL_LOADED':
          setModelLoading(false);
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
          setModelLoading(false);
          break;
      }
    };

    // Start loading the model immediately
    worker.postMessage({ type: 'LOAD_MODEL' } as WorkerMessage);

    return () => {
      worker.terminate();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced analysis function
  const analyze = useCallback((text: string) => {
    if (!workerRef.current) return;

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set a new timer (800ms debounce)
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

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return { analyze };
}