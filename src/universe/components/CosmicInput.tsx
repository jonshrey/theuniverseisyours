// src/universe/components/CosmicInput.tsx
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useUniverseStore } from '../store/universeStore';
import { useSentimentWorker } from '../../ai/hooks/useSentimentWorker';
import styles from './CosmicInput.module.css';

export function CosmicInput() {
    const [localValue, setLocalValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Zustand
    const {
        setUserInput,
        isModelLoading,
        isProcessing,
        sentimentScore,
    } = useUniverseStore();

    // Worker
    const { analyze } = useSentimentWorker();

    // Flare state: brief color pulse after analysis
    const [flare, setFlare] = useState<'positive' | 'negative' | null>(null);

    // Keep Zustand in sync with local input and trigger analysis
    const handleChange = (text: string) => {
        setLocalValue(text);
        setUserInput(text);
        analyze(text); // debounce is handled inside the hook
    };

    // Show a brief flare when analysis completes
    useEffect(() => {
        if (!isProcessing && sentimentScore !== 0) {
            const mood: 'positive' | 'negative' =
                sentimentScore > 0.1 ? 'positive' : 'negative';
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setFlare(mood);
            const timer = setTimeout(() => setFlare(null), 600);
            return () => clearTimeout(timer);
        }
    }, [isProcessing, sentimentScore]);

    // Auto-focus on mount
    useEffect(() => {
        requestAnimationFrame(() => {
            inputRef.current?.focus();
        });
    }, []);

    // Prevent form submission
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
                    {/* Prompt text */}
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

                    {/* Subtle indicator dots */}
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