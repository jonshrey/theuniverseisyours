// src/universe/engine/UniverseEngine.ts
import type {
  CelestialEntity,
  Renderable,
  UniverseConfig,
  AccretionDiskData,
  PlanetData,
} from '../../lib/types';

export class UniverseEngine {
  private config: UniverseConfig;
  private currentGravity: number;

  constructor(config: UniverseConfig) {
    this.config = config;
    this.currentGravity = config.globalGravity;
  }

  public setConfig(partial: Partial<UniverseConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  public tick(entities: CelestialEntity[], deltaTime: number): void {
    // Smooth gravity transition (affects accretion disk)
    const target = this.config.globalGravity;
    const step = 40;
    if (this.currentGravity < target) {
      this.currentGravity = Math.min(this.currentGravity + step * deltaTime, target);
    } else if (this.currentGravity > target) {
      this.currentGravity = Math.max(this.currentGravity - step * deltaTime, target);
    }
    const G = this.currentGravity;

    for (const entity of entities) {
      switch (entity.type) {
        case 'accretionDisk':
          this.updateAccretionDisk(entity.data, deltaTime, G);
          break;
        case 'planet':
          this.updatePlanet(entity.data, deltaTime);
          break;
        // future cases…
      }
    }
  }

  public getRenderables(entities: CelestialEntity[]): Renderable[] {
    const renderables: Renderable[] = [];
    for (const entity of entities) {
      switch (entity.type) {
        case 'accretionDisk':
          renderables.push(...this.renderAccretionDisk(entity));
          break;
        case 'planet':
          renderables.push(...this.renderPlanet(entity));
          break;
      }
    }
    return renderables;
  }

  // ------------------------------------------------------------------
  //  ACCRETION DISK (unchanged)
  // ------------------------------------------------------------------
  private updateAccretionDisk(data: AccretionDiskData, deltaTime: number, G: number): void {
    const { particles } = data;
    const STAR_MASS = 1.0;
    const MIN_DISTANCE = 5.0;
    const MAX_DISTANCE = 450;
    const VELOCITY_SCALE = 50;

    for (let i = 0; i < particles.x.length; i++) {
      const dx = -particles.x[i];
      const dy = -particles.y[i];
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);

      if (dist < MIN_DISTANCE) {
        this.respawnParticle(particles, i, G);
        continue;
      }
      if (dist > MAX_DISTANCE) {
        this.respawnParticle(particles, i, G);
        continue;
      }

      const force = (G * STAR_MASS) / distSq * VELOCITY_SCALE;
      const ax = (dx / dist) * force;
      const ay = (dy / dist) * force;

      particles.vx[i] += ax * deltaTime;
      particles.vy[i] += ay * deltaTime;
      particles.x[i] += particles.vx[i] * deltaTime;
      particles.y[i] += particles.vy[i] * deltaTime;
    }
  }

  private respawnParticle(
    particles: AccretionDiskData['particles'],
    index: number,
    G: number,
  ): void {
    const angle = Math.random() * 2 * Math.PI;
    const radius = 120 + Math.random() * 130;
    const vCirc = Math.sqrt((G * 1.0) / radius) * 50;

    particles.x[index] = Math.cos(angle) * radius;
    particles.y[index] = Math.sin(angle) * radius;
    const tx = -Math.sin(angle);
    const ty = Math.cos(angle);
    const ecc = 0.7 + Math.random() * 0.6;
    particles.vx[index] = tx * vCirc * ecc;
    particles.vy[index] = ty * vCirc * ecc;
  }

  private renderAccretionDisk(entity: CelestialEntity & { type: 'accretionDisk' }): Renderable[] {
    const { id, position, data } = entity;
    const { particles } = data;
    const output: Renderable[] = [];

    for (let i = 0; i < particles.x.length; i++) {
      const px = position.x + particles.x[i];
      const py = position.y + particles.y[i];
      const dist = Math.sqrt(particles.x[i] ** 2 + particles.y[i] ** 2);
      const speed = Math.sqrt(particles.vx[i] ** 2 + particles.vy[i] ** 2);

      const tempFactor = Math.max(0, 1 - dist / 300);
      const hue = 200 + tempFactor * 160;
      const sat = 70 + tempFactor * 30;
      const light = 50 + tempFactor * 30 + Math.min(speed * 2, 30);

      output.push({
        id: `${id}-particle-${i}`,
        type: 'particle',
        x: px,
        y: py,
        color: `hsl(${hue}, ${sat}%, ${light}%)`,
        size: 2.5 + tempFactor * 2.5,
        opacity: 1.0,
        meta: { speed, dist },
      });
    }
    return output;
  }

  // ------------------------------------------------------------------
  //  PLANET
  // ------------------------------------------------------------------
  private updatePlanet(data: PlanetData, deltaTime: number): void {
    // Advance the angle based on angular speed
    data.angle += data.speed * deltaTime;
    // Keep angle within [0, 2π] for cleanliness (optional)
    data.angle = data.angle % (Math.PI * 2);
  }

  private renderPlanet(entity: CelestialEntity & { type: 'planet' }): Renderable[] {
    const { id, position, data, color } = entity;
    const px = position.x + Math.cos(data.angle) * data.orbitRadius;
    const py = position.y + Math.sin(data.angle) * data.orbitRadius;

    return [
      {
        id: `${id}-orbit`,
        type: 'circle',
        x: position.x,
        y: position.y,
        radius: data.orbitRadius,
        color: 'rgba(255,255,255,0.05)',
        size: 1,
        opacity: 1,
        meta: { isOrbit: true },
      },
      {
        id: `${id}-planet`,
        type: 'circle',
        x: px,
        y: py,
        color: color || '#88ccff',
        size: 8,
        opacity: 1,
        meta: {
          name: data.name,
          description: data.description,
          isPlanet: true,
        },
      },
      {
        id: `${id}-label`,
        type: 'text',
        x: px,
        y: py - 12,
        color: '#ffffff',
        size: 12,
        opacity: 0.9,
        meta: { text: data.name },
      },
    ];
  }
}