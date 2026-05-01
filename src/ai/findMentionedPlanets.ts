// src/ai/findMentionedPlanets.ts
import type { CelestialEntity } from '../lib/types';

/**
 * Scan user text for mentions of planets that already exist.
 * Planets are identified by their id (“interest‑coffee” → keyword “coffee”).
 *
 * @param planets  current planet entities from the store
 * @param text     raw user input
 * @returns        array of planet IDs that should glow
 */
export function findMentionedPlanets(
  planets: CelestialEntity[],
  text: string
): string[] {
  const lowerText = text.toLowerCase();
  const mentionedIds: string[] = [];

  for (const planet of planets) {
    if (planet.type !== 'planet') continue;

    // Our planet IDs use the pattern “interest‑<keyword>”
    const keyword = planet.id.split('-')[1];
    if (keyword && lowerText.includes(keyword)) {
      mentionedIds.push(planet.id);
    }
  }

  return mentionedIds;
}