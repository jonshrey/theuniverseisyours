// src/universe/components/RealisticStarField.tsx
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  randomStarProperties,
  magnitudeToSizeFactor,
  temperatureToColor,
} from '../math/starMath';

interface RealisticStarFieldProps {
  starCount?: number;
  sphereRadius?: number;
  baseSize?: number;        // base point size for the faintest stars
}

export function RealisticStarField({
  starCount = 2000,
  sphereRadius = 200,
  baseSize = 0.5,
}: RealisticStarFieldProps) {
  const pointsRef = useRef<THREE.Points>(null!);

  // Generate geometry + attributes once
  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizeFactors = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const { position, magnitude, temperature } = randomStarProperties(sphereRadius);

      // Position
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      // Colour — blackbody
      const color = temperatureToColor(temperature);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Size factor (logarithmic perception)
      sizeFactors[i] = magnitudeToSizeFactor(magnitude);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('sizeFactor', new THREE.BufferAttribute(sizeFactors, 1));

    // Custom shader material that respects per‑vertex sizeFactor
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uBaseSize: { value: baseSize },
      },
      vertexShader: /* glsl */ `
        attribute float sizeFactor;
        varying vec3 vColor;
        uniform float uBaseSize;
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          // Point size: baseSize scaled by sizeFactor, with distance attenuation
          gl_PointSize = uBaseSize * sizeFactor * (300.0 / -mvPosition.z);
          gl_PointSize = clamp(gl_PointSize, 0.5, 8.0);
          vColor = color;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        void main() {
          // Circular point with soft edge
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.4, 0.5, dist);
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry: geo, material: mat };
  }, [starCount, sphereRadius, baseSize]);

  // Optional slow rotation to simulate Earth’s movement
  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.01;
    }
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}