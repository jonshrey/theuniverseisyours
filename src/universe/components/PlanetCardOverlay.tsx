// src/universe/components/PlanetCardOverlay.tsx
import { useUniverseStore } from '../store/universeStore';

/**
 * Mock data for planet details.  Later you can fetch this from an API
 * or derive it from the planet entity itself.
 */
const PLANET_DETAILS: Record<string, { title: string; description: string }> = {
  'favorite-coffee': {
    title: 'Your Coffee Ritual',
    description: 'You love a strong espresso after waking up. Today’s suggestion: try a Vanilla Oat Latte — smooth, creamy, and perfect for creative coding.',
  },
  'favorite-music': {
    title: 'Your Soundtrack',
    description: 'Lo‑fi beats while you code, jazz in the evening. Tonight’s pick: "Kind of Blue" by Miles Davis, because the universe needs a little cool.',
  },
  'favorite-reading': {
    title: 'Currently Reading',
    description: 'You\'re deep into "The Three‑Body Problem" — a cosmic mystery that mirrors this very universe. Next up: "Project Hail Mary".',
  },
  'interest-coffee': {
    title: 'Coffee Love',
    description: 'A fresh discovery! Coffee is not just a drink; it’s a ritual that fuels your universe. Recommended: Ethiopian Yirgacheffe pour‑over.',
  },
  'interest-typescript': {
    title: 'TypeScript Wizardry',
    description: 'You wield types with precision. Try the new "satisfies" operator in TS 4.9+ — it’s a game‑changer for type safety.',
  },
  'interest-react': {
    title: 'React Universe',
    description: 'React is your canvas. Explore React Server Components — they blur the line between frontend and backend.',
  },
  'interest-music': {
    title: 'Melody Seeker',
    description: 'Music is the heartbeat of your universe. Create a playlist with Hans Zimmer and Ólafur Arnalds for deep focus.',
  },
  'interest-chicken': {
    title: 'Chicken Delight',
    description: 'You appreciate good food. Recipe: Marinate chicken thighs in lemon, garlic, and rosemary. Grill until smoky. Serve with roasted veggies. Bon appétit!',
  },
  'interest-reading': {
    title: 'Bookworm',
    description: 'You enjoy stories that expand your mind. Add "The Expanse" series to your reading list — it’s space opera at its finest.',
  },
};

export function PlanetCardOverlay() {
  const selectedPlanetId = useUniverseStore((s) => s.selectedPlanetId);
  const planetEntities = useUniverseStore((s) => s.planetEntities);
  const setSelectedPlanetId = useUniverseStore((s) => s.setSelectedPlanetId);

  if (!selectedPlanetId) return null; // nothing to show

  const planet = planetEntities.find((p) => p.id === selectedPlanetId);
  if (!planet || planet.type !== 'planet') return null;

  const details = PLANET_DETAILS[planet.id] ?? {
    title: planet.data.name,
    description: 'A distant world in your personal universe. More details coming soon.',
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 40,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(10, 12, 30, 0.85)',
        backdropFilter: 'blur(20px)',
        borderRadius: 20,
        padding: '28px 36px',
        color: '#fff',
        maxWidth: 460,
        width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)',
        fontFamily: "'Space Mono', monospace",
        zIndex: 100,
        transition: 'all 0.3s ease',
      }}
    >
      {/* Close button */}
      <button
        onClick={() => setSelectedPlanetId(null)}
        style={{
          position: 'absolute',
          top: 16,
          right: 20,
          background: 'none',
          border: 'none',
          color: '#aaa',
          fontSize: 20,
          cursor: 'pointer',
          padding: 0,
          lineHeight: 1,
        }}
        aria-label="Close details"
      >
        ✕
      </button>

      <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: planet.data.color ?? '#88ccff' }}>
        {planet.data.name}
      </h2>
      <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 400, opacity: 0.7 }}>
        {details.title}
      </h3>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, opacity: 0.9 }}>
        {details.description}
      </p>

      {/* Subtle footer */}
      <div
        style={{
          marginTop: 24,
          paddingTop: 16,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          fontSize: 11,
          opacity: 0.5,
          textAlign: 'center',
        }}
      >
        Click the star or empty space to dismiss
      </div>
    </div>
  );
}