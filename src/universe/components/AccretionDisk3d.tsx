// src/universe/components/AccretionDisk3D.tsx
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CelestialEntity, AccretionDiskData } from '../../lib/types';

const PIXEL_TO_UNIT = 1 / 28;
const DISK_SPREAD = 280 * PIXEL_TO_UNIT; // ~10 units

// Custom shader material for soft, glowing particles
const diskMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uBaseSize: { value: 0.08 },
  },
  vertexShader: /* glsl */ `
    attribute float sizeFactor;
    varying vec3 vColor;
    varying float vGlow;
    uniform float uBaseSize;
    uniform float uTime;
    void main() {
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      // Point size: baseSize scaled by sizeFactor, with distance attenuation
      gl_PointSize = uBaseSize * sizeFactor * (200.0 / -mvPosition.z);
      gl_PointSize = clamp(gl_PointSize, 0.4, 6.0);
      vColor = color;
      vGlow = sizeFactor;
    }
  `,
  fragmentShader: /* glsl */ `
    varying vec3 vColor;
    varying float vGlow;
    void main() {
      // Soft circular point with radial falloff
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;
      float alpha = 1.0 - smoothstep(0.2, 0.5, dist);
      alpha *= 0.9;
      // Inner glow (brighter core)
      float innerAlpha = 1.0 - smoothstep(0.0, 0.15, dist);
      alpha += innerAlpha * 0.3;
      alpha = min(alpha, 1.0);
      gl_FragColor = vec4(vColor, alpha);
    }
  `,
  vertexColors: true,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

interface Props {
  entity: CelestialEntity & { type: 'accretionDisk' };
}

export function AccretionDisk3D({ entity }: Props) {
  const pointsRef = useRef<THREE.Points>(null!);
  const data = entity.data as AccretionDiskData;
  const count = data.particleCount;

  // Build geometry: positions, colors, and per‑particle sizeFactor
  const geometry = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    // We'll fill with zeros initially; the actual positions will be updated every frame.
    // But we need a valid geometry to start.
    for (let i = 0; i < count; i++) {
      // Place particles in a rough disk to avoid empty initial frame
      const angle = Math.random() * Math.PI * 2;
      const radius = 2 + Math.random() * 8; // world units
      const y = (Math.random() - 0.5) * 0.3 * (radius / 10); // thin disk, thicker at edges
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = Math.sin(angle) * radius;

      col[i * 3] = 1.0;
      col[i * 3 + 1] = 0.6;
      col[i * 3 + 2] = 0.2;

      sizes[i] = 1.0;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('sizeFactor', new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [count]);

  // Update per frame: read from the physics engine
  useFrame(() => {
    const posArr = pointsRef.current.geometry.attributes.position.array as Float32Array;
    const colArr = pointsRef.current.geometry.attributes.color.array as Float32Array;
    const sizeArr = pointsRef.current.geometry.attributes.sizeFactor.array as Float32Array;

    for (let i = 0; i < count; i++) {
      // Convert engine coordinates (pixels) to world units
      const px = data.particles.x[i] * PIXEL_TO_UNIT;
      const pz = data.particles.y[i] * PIXEL_TO_UNIT;

      // Compute radius in world units
      const r = Math.sqrt(px * px + pz * pz);

      // Disk thickness: very thin at inner edge, gradually thicker outward
      const thickness = 0.05 + (r / DISK_SPREAD) * 0.5;
      const y = (Math.random() - 0.5) * thickness; // random vertical offset within thickness

      posArr[i * 3] = px;
      posArr[i * 3 + 1] = y;
      posArr[i * 3 + 2] = pz;

      // Colour: hot white‑orange inner rim, fading to cooler red‑orange outward
      const normDist = Math.max(0, 1 - r / DISK_SPREAD);
      const speed = Math.sqrt(data.particles.vx[i] ** 2 + data.particles.vy[i] ** 2) * PIXEL_TO_UNIT;

      // Inner rim hotspot (very bright, white‑hot)
      const isInner = r < 2.5 ? 1.0 : 0.0;
      // Smooth transition from hot to cooler
      const rChan = 1.0;
      const gChan = 0.3 + normDist * 0.5 + isInner * 0.3;
      const bChan = normDist * 0.2 + isInner * 0.1;
      colArr[i * 3] = Math.min(1, rChan);
      colArr[i * 3 + 1] = Math.min(1, gChan);
      colArr[i * 3 + 2] = Math.min(1, bChan);

      // Size factor: larger for inner rim and brighter areas
      const sizeBoost = 1.0 + isInner * 3.0 + normDist * 0.5;
      sizeArr[i] = sizeBoost;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.geometry.attributes.color.needsUpdate = true;
    pointsRef.current.geometry.attributes.sizeFactor.needsUpdate = true;

    // Update time uniform for any future animation
    diskMaterial.uniforms.uTime.value += 0.016;
  });

  return (
    <points ref={pointsRef} geometry={geometry} material={diskMaterial} />
  );
}