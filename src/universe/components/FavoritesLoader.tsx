// src/universe/components/FavoritesLoader.tsx
import { useEffect } from 'react';
import { useUniverseStore } from '../store/universeStore';
import { FAVORITES } from '../../data/userProfile';
import type { CelestialEntity } from '../../lib/types';

export function FavoritesLoader() {
  const addOrUpdatePlanet = useUniverseStore((state) => state.addOrUpdatePlanet);

  useEffect(() => {
    for (const fav of FAVORITES) {
      const offsetX = (Math.random() - 0.5) * 600;
      const offsetY = (Math.random() - 0.5) * 400;

      const planet: CelestialEntity = {
        id: `favorite-${fav.keyword}`,
        type: 'planet',
        position: { x: 0, y: 0 },
        data: {
          x: offsetX,
          y: offsetY,
          name: fav.name,
          color: fav.color,
          spawnTime: Date.now() - 2000, // already born – no spawn animation
        },
      };
      addOrUpdatePlanet(planet);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}