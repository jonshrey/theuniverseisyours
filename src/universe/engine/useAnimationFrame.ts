// src/universe/engine/useAnimationFrame.ts
import { useRef, useEffect } from 'react';

/**
 * Custom hook that runs a callback on every animation frame.
 * Provides the delta time in seconds since the last frame.
 * The callback runs outside React's render cycle for performance.
 */
export function useAnimationFrame(callback: (deltaTime: number) => void): void {
    const requestRef = useRef<number>(0);
    const previousTimeRef = useRef<number>(0);

    useEffect(() => {
        const animate = (time: number) => {
            if (previousTimeRef.current !== 0) {
                const deltaTime = Math.min(
                    0.1, // Cap at 100ms to avoid huge jumps after tab inactivity
                    (time - previousTimeRef.current) / 1000 // Convert ms to seconds
                );
                callback(deltaTime);
            }
            previousTimeRef.current = time;
            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);

        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [callback]);
}