// src/lib/types.ts

/* ------------------------------------------------------------------ */
/*  Entity‑specific data interfaces (one per type)                    */
/* ------------------------------------------------------------------ */

export interface AccretionDiskData {
  particleCount: number;
  spreadRadius: number;
  particles: {
    x: Float32Array;
    y: Float32Array;
    vx: Float32Array;
    vy: Float32Array;
  };
}

export interface PlanetData {
  /** Offset from the entity origin (canvas centre) */
  x: number;
  y: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  spawnTime?: number; // for fade‑in animation
}
export interface StarData {
  temperature: number; // Kelvin, drives colour
  radius: number; // visual radius
}

export interface NebulaData {
  density: number; // 0‑1
  cloudPoints: { x: number; y: number; opacity: number }[];
}

export interface CometData {
  velocity: { x: number; y: number };
  tailLength: number;
}

/* ------------------------------------------------------------------ */
/*  Discriminated union of all possible celestial entities            */
/* ------------------------------------------------------------------ */

export type CelestialEntity =
  | {
      id: string;
      type: "accretionDisk";
      position: { x: number; y: number };
      data: AccretionDiskData;
      color?: string;
      size?: number;
    }
  | {
      id: string;
      type: "planet";
      position: { x: number; y: number }; // relative to the central star
      data: PlanetData;
      color?: string;
      size?: number;
    }
  | {
      id: string;
      type: "star";
      position: { x: number; y: number };
      data: StarData;
      color?: string;
      size?: number;
    }
  | {
      id: string;
      type: "nebula";
      position: { x: number; y: number };
      data: NebulaData;
      color?: string;
      size?: number;
    }
  | {
      id: string;
      type: "comet";
      position: { x: number; y: number };
      data: CometData;
      color?: string;
      size?: number;
    };

/* ------------------------------------------------------------------ */
/*  Renderables (unchanged from previous)                             */
/* ------------------------------------------------------------------ */

export interface Renderable {
  id: string;
  type: "particle" | "circle" | "text" | "custom";
  x: number;
  y: number;
  color: string;
  size: number;
  opacity: number;
  radius?: number; // for circles
  meta?: Record<string, unknown>;
}

export interface UniverseConfig {
  canvasWidth: number;
  canvasHeight: number;
  globalGravity: number;
}
