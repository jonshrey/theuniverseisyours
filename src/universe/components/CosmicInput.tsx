// src/universe/components/CosmicInput.tsx
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useUniverseStore } from '../store/universeStore';
import { useSentimentWorker } from '../../ai/hooks/useSentimentWorker';
import { detectInterests } from '../../ai/detectInterests';
import styles from './CosmicInput.module.css';

export function CosmicInput() {
  const [localValue, setLocalValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const interestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------- Zustand ----------
  const {
    setUserInput,
    isModelLoading,
    isProcessing,
    sentimentScore,
    addOrUpdatePlanet,
  } = useUniverseStore();

  // ---------- Sentiment worker ----------
  const { analyze } = useSentimentWorker();

  // ---------- Flare pulse state ----------
  const [flare, setFlare] = useState<'positive' | 'negative' | null>(null);

  // Track previous processing state to detect the falling edge
  const prevProcessingRef = useRef(isProcessing);

  // ---------- Auto‑focus ----------
  useEffect(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  // ---------- Flare effect (only when processing ends) ----------
  useEffect(() => {
    const wasProcessing = prevProcessingRef.current;
    prevProcessingRef.current = isProcessing;

    if (!isProcessing && wasProcessing && sentimentScore !== 0) {
      const mood: 'positive' | 'negative' =
        sentimentScore > 0.1 ? 'positive' : 'negative';
      // Defer to avoid synchronous setState in effect
      const showTimer = setTimeout(() => setFlare(mood), 0);
      const clearTimer = setTimeout(() => setFlare(null), 600);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(clearTimer);
      };
    }
  }, [isProcessing, sentimentScore]);

  // ---------- Debounced interest detection ----------
  useEffect(() => {
    if (interestTimerRef.current) {
      clearTimeout(interestTimerRef.current);
    }

    const text = localValue.trim();
    if (text.length === 0) return;

    interestTimerRef.current = setTimeout(() => {
      const newPlanets = detectInterests(text);
      for (const planet of newPlanets) {
        addOrUpdatePlanet(planet);
      }
    }, 800);

    return () => {
      if (interestTimerRef.current) {
        clearTimeout(interestTimerRef.current);
      }
    };
  }, [localValue, addOrUpdatePlanet]);

  // ---------- Input handler ----------
  const handleChange = (text: string) => {
    setLocalValue(text);
    setUserInput(text);
    analyze(text); // debounced inside the hook
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className={styles.overlay}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div
          className={[
            styles.inputWrapper,
            flare === 'positive' ? styles.flarePositive : '',
            flare === 'negative' ? styles.flareNegative : '',
          ].join(' ')}
        >
          <label htmlFor="cosmic-input" className={styles.prompt}>
            {isModelLoading
              ? 'Awakening the universe...'
              : isProcessing
              ? 'Feeling your thoughts...'
              : 'How do you feel?'}
          </label>

          <input
            id="cosmic-input"
            ref={inputRef}
            type="text"
            className={styles.input}
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="type your thought..."
            autoComplete="off"
            spellCheck={false}
            disabled={isModelLoading}
          />

          <div className={styles.indicator}>
            <span
              className={[
                styles.dot,
                isModelLoading
                  ? styles.loading
                  : isProcessing
                  ? styles.thinking
                  : sentimentScore > 0.1
                  ? styles.positiveDot
                  : sentimentScore < -0.1
                  ? styles.negativeDot
                  : '',
              ].join(' ')}
            />
            <span className={styles.dotLabel}>
              {isModelLoading
                ? 'loading AI'
                : isProcessing
                ? 'analysing'
                : sentimentScore > 0.1
                ? 'positive'
                : sentimentScore < -0.1
                ? 'negative'
                : 'neutral'}
            </span>
          </div>
        </div>
      </form>
    </div>
  );
}