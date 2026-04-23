// src/ai/detectInterests.ts
import type { CelestialEntity } from '../lib/types';

/**
 * Configuration for a single interest.
 */
interface InterestConfig {
  name: string;
  color: string;
  orbitRadius: number;
  speed: number;        // radians per second
}

/**
 * Map of lowercase keywords to their visual / orbital properties.
 * Extend this with anything you like – later it can live in a backend.
 */
const INTEREST_CATALOG: Readonly<Record<string, InterestConfig>> = {
  coffee:     { name: 'Coffee ☕',       color: '#c0a080', orbitRadius: 120, speed: 0.5 },
  typescript: { name: 'TypeScript 🔷',  color: '#3178c6', orbitRadius: 160, speed: 0.4 },
  react:      { name: 'React ⚛️',       color: '#61dafb', orbitRadius: 140, speed: 0.45 },
  music:      { name: 'Music 🎵',       color: '#ff66aa', orbitRadius: 180, speed: 0.35 },
  chicken:    { name: 'Chicken 🍗',     color: '#d4a017', orbitRadius: 150, speed: 0.42 },
  reading:    { name: 'Reading 📚',     color: '#a0d2db', orbitRadius: 130, speed: 0.38 },
  // Add more as you like
};

/**
 * Scan a piece of text and return celestial entities for every
 * recognised interest keyword.
 *
 * @param text - raw user input
 * @returns Array of planet entities that should exist in the universe
 */
export function detectInterests(text: string): CelestialEntity[] {
  const lowerText = text.toLowerCase();
  const entities: CelestialEntity[] = [];

  for (const [keyword, config] of Object.entries(INTEREST_CATALOG)) {
    if (lowerText.includes(keyword)) {
      entities.push({
        id: `interest-${keyword}`,
        type: 'planet',
        position: { x: 0, y: 0 }, // Will be placed relative to the canvas centre
        data: {
          orbitRadius: config.orbitRadius,
          angle: Math.random() * 2 * Math.PI, // random starting position
          speed: config.speed,
          name: config.name,
          color: config.color,
        },
      });
    }
  }

  return entities;
}