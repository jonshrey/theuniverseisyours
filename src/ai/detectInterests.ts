// src/ai/detectInterests.ts
import type { CelestialEntity } from '../lib/types';

interface InterestConfig {
  name: string;
  color: string;
}

const INTEREST_CATALOG: Readonly<Record<string, InterestConfig>> = {
  coffee:     { name: 'Coffee ☕',       color: '#c0a080' },
  typescript: { name: 'TypeScript 🔷',  color: '#3178c6' },
  react:      { name: 'React ⚛️',       color: '#61dafb' },
  music:      { name: 'Music 🎵',       color: '#ff66aa' },
  chicken:    { name: 'Chicken 🍗',     color: '#d4a017' },
  reading:    { name: 'Reading 📚',     color: '#a0d2db' },
};

/**
 * Scan text for known interest keywords and return planet entities
 * placed at random positions around the canvas centre.
 */
export function detectInterests(text: string): CelestialEntity[] {
  const lowerText = text.toLowerCase();
  const entities: CelestialEntity[] = [];

  for (const [keyword, config] of Object.entries(INTEREST_CATALOG)) {
    if (lowerText.includes(keyword)) {
      // Random position offset from centre
      const offsetX = (Math.random() - 0.5) * 600;
      const offsetY = (Math.random() - 0.5) * 400;

      entities.push({
        id: `interest-${keyword}`,
        type: 'planet',
        position: { x: 0, y: 0 }, // will be set to canvas centre by the component
        data: {
          x: offsetX,
          y: offsetY,
          name: config.name,
          color: config.color,
          spawnTime: Date.now(),
        },
      });
    }
  }

  return entities;
}