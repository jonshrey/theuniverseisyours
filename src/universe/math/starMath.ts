// src/universe/math/starMath.ts
import * as THREE from 'three';

// ------------------------------------------------------------------
// 1. Magnitude → visual size factor
//    Based on Pogson's law & Weber‑Fechner: logarithmic response.
//    Typical naked‑eye limit: mag +6 (faintest), brightest: mag −1.5.
//    We map mag −1.5 → sizeFactor 1.0, mag +6 → sizeFactor 0.01.
//    Returns a value in [0,1] that can be multiplied by a base radius.
// ------------------------------------------------------------------
export function magnitudeToSizeFactor(
  magnitude: number,
  faintestMagnitude = 6.0,
  brightestMagnitude = -1.5
): number {
  // Clamp to range
  const clampedMag = Math.max(brightestMagnitude, Math.min(faintestMagnitude, magnitude));
  // Linear interpolation in log space? We'll do linear in magnitude.
  const t = (clampedMag - brightestMagnitude) / (faintestMagnitude - brightestMagnitude);
  // Exponential to simulate log perception: brighter stars are much larger.
  return Math.exp(-t * 4.5); // tweaked constant for visual appeal
}

// ------------------------------------------------------------------
// 2. Blackbody colour (approximate)
//    We use a precomputed lookup table from 1000 K to 40,000 K,
//    based on Planck integration → CIE XYZ → sRGB.
//    Source: http://www.vendian.org/mncharity/dir3/blackbody/
//    Uncharted territory below 1000 K (brown dwarfs) returns red.
// ------------------------------------------------------------------
const BLACKBODY_LUT: { temp: number; r: number; g: number; b: number }[] = [
  { temp: 1000, r: 1.000, g: 0.033, b: 0.000 },
  { temp: 1500, r: 1.000, g: 0.128, b: 0.000 },
  { temp: 2000, r: 1.000, g: 0.234, b: 0.010 },
  { temp: 2500, r: 1.000, g: 0.350, b: 0.060 },
  { temp: 3000, r: 1.000, g: 0.462, b: 0.138 },
  { temp: 3500, r: 1.000, g: 0.555, b: 0.227 },
  { temp: 4000, r: 1.000, g: 0.630, b: 0.312 },
  { temp: 4500, r: 1.000, g: 0.695, b: 0.389 },
  { temp: 5000, r: 1.000, g: 0.753, b: 0.459 },
  { temp: 5500, r: 1.000, g: 0.806, b: 0.524 },
  { temp: 6000, r: 1.000, g: 0.855, b: 0.585 },
  { temp: 6500, r: 1.000, g: 0.901, b: 0.644 },
  { temp: 7000, r: 0.988, g: 0.908, b: 0.686 },
  { temp: 7500, r: 0.930, g: 0.892, b: 0.723 },
  { temp: 8000, r: 0.882, g: 0.878, b: 0.757 },
  { temp: 8500, r: 0.842, g: 0.868, b: 0.789 },
  { temp: 9000, r: 0.807, g: 0.858, b: 0.817 },
  { temp: 9500, r: 0.777, g: 0.850, b: 0.843 },
  { temp: 10000, r: 0.751, g: 0.843, b: 0.867 },
  { temp: 15000, r: 0.638, g: 0.793, b: 1.000 },
  { temp: 20000, r: 0.567, g: 0.747, b: 1.000 },
  { temp: 30000, r: 0.492, g: 0.680, b: 1.000 },
  { temp: 40000, r: 0.454, g: 0.639, b: 1.000 },
];

export function temperatureToColor(temperature: number): THREE.Color {
  const lut = BLACKBODY_LUT;
  if (temperature <= lut[0].temp) return new THREE.Color(lut[0].r, lut[0].g, lut[0].b);
  if (temperature >= lut[lut.length - 1].temp)
    return new THREE.Color(lut[lut.length - 1].r, lut[lut.length - 1].g, lut[lut.length - 1].b);

  for (let i = 1; i < lut.length; i++) {
    if (temperature <= lut[i].temp) {
      const t = (temperature - lut[i - 1].temp) / (lut[i].temp - lut[i - 1].temp);
      return new THREE.Color(
        THREE.MathUtils.lerp(lut[i - 1].r, lut[i].r, t),
        THREE.MathUtils.lerp(lut[i - 1].g, lut[i].g, t),
        THREE.MathUtils.lerp(lut[i - 1].b, lut[i].b, t),
      );
    }
  }
  return new THREE.Color(1, 1, 1);
}

// ------------------------------------------------------------------
// 3. Equatorial → Cartesian (celestial sphere)
//    ra  = right ascension in radians (0 to 2π)
//    dec = declination in radians (-π/2 to +π/2)
//    radius = distance (usually large for background stars)
// ------------------------------------------------------------------
export function equatorialToCartesian(ra: number, dec: number, radius: number): THREE.Vector3 {
  const x = radius * Math.cos(dec) * Math.cos(ra);
  const y = radius * Math.sin(dec);
  const z = radius * Math.cos(dec) * Math.sin(ra);
  return new THREE.Vector3(x, y, z);
}

// ------------------------------------------------------------------
// 4. Random realistic star generator
//    - Magnitude distribution: Salpeter‑like, more faint stars.
//    - Temperature: main‑sequence stars from 3000 K to 30000 K.
//    - Position: uniformly random RA, Dec on a sphere of given radius.
// ------------------------------------------------------------------
export function randomStarProperties(radius: number): {
  position: THREE.Vector3;
  magnitude: number;
  temperature: number;
} {
  // Magnitude: 80% between +2 and +6, 20% brighter (-1.5 to +2)
  const magnitude = Math.random() < 0.8
    ? THREE.MathUtils.lerp(2.0, 6.0, Math.random())
    : THREE.MathUtils.lerp(-1.5, 2.0, Math.random());

  // Temperature: most stars are cool (M/K/G), few are hot (O/B/A)
  // We'll use a simple random with weighting toward 3000–6000 K.
  const tempRand = Math.random();
  let temperature: number;
  if (tempRand < 0.6) {
    // 3000–5000 K (red/orange)
    temperature = THREE.MathUtils.lerp(3000, 5000, Math.random());
  } else if (tempRand < 0.9) {
    // 5000–8000 K (yellow/white)
    temperature = THREE.MathUtils.lerp(5000, 8000, Math.random());
  } else {
    // 8000–30000 K (blue/white‑blue)
    temperature = THREE.MathUtils.lerp(8000, 30000, Math.random());
  }

  // Random position on sphere
  const ra = Math.random() * Math.PI * 2;
  const dec = Math.asin(2 * Math.random() - 1); // uniform distribution on sphere

  return {
    position: equatorialToCartesian(ra, dec, radius),
    magnitude,
    temperature,
  };
}