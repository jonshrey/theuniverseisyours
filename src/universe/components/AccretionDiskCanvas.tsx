// src/universe/components/AccretionDiskCanvas.tsx
import { useRef, useEffect, useState, useCallback } from 'react';
import { UniverseEngine } from '../engine/UniverseEngine';
import { useAnimationFrame } from '../engine/useAnimationFrame';
import { useUniverseStore } from '../store/universeStore';
import type { CelestialEntity, Renderable, AccretionDiskData } from '../../lib/types';
import styles from './AccretionDiskCanvas.module.css';

export function AccretionDiskCanvas() {
  // ---------- Refs ----------
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<UniverseEngine | null>(null);
  const entityRef = useRef<CelestialEntity | null>(null); // always holds the current accretion disk

  // ---------- Canvas dimensions ----------
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // ---------- Zustand ----------
  const gravity = useUniverseStore((state) => state.gravity);
  const planetEntities = useUniverseStore((state) => state.planetEntities);
  const highlightedPlanetIds = useUniverseStore((state) => state.highlightedPlanetIds);

  // ---------- Create engine & disk entity once ----------
  useEffect(() => {
    engineRef.current = new UniverseEngine({
      canvasWidth: dimensions.width,
      canvasHeight: dimensions.height,
      globalGravity: gravity,
    });

    const particleCount = 800;
    const diskData: AccretionDiskData = {
      particleCount,
      spreadRadius: 280,
      particles: {
        x: new Float32Array(particleCount),
        y: new Float32Array(particleCount),
        vx: new Float32Array(particleCount),
        vy: new Float32Array(particleCount),
      },
    };

    // Seed particles
    const minRadius = 25;
    const spreadRadius = diskData.spreadRadius;
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const radius = minRadius + (spreadRadius - minRadius) * Math.sqrt(Math.random());
      diskData.particles.x[i] = radius * Math.cos(angle);
      diskData.particles.y[i] = radius * Math.sin(angle);

      const vCirc = Math.sqrt((gravity * 1.0) / radius) * 50; // STAR_MASS=1, VELOCITY_SCALE=50
      const tx = -Math.sin(angle);
      const ty = Math.cos(angle);
      const ecc = 0.7 + Math.random() * 0.6;
      diskData.particles.vx[i] = tx * vCirc * ecc;
      diskData.particles.vy[i] = ty * vCirc * ecc;
    }

    const diskEntity: CelestialEntity = {
      id: 'sentiment-disk',
      type: 'accretionDisk',
      position: { x: dimensions.width / 2, y: dimensions.height / 2 },
      data: diskData,
    };

    entityRef.current = diskEntity;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Sync engine config (size & gravity) ----------
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setConfig({
        canvasWidth: dimensions.width,
        canvasHeight: dimensions.height,
        globalGravity: gravity,
      });
    }
    // Also keep the disk centred when resizing
    if (entityRef.current) {
      entityRef.current.position = {
        x: dimensions.width / 2,
        y: dimensions.height / 2,
      };
    }
  }, [dimensions, gravity]);

  // ---------- Resize handler ----------
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const container = canvasRef.current.parentElement;
        if (container) {
          const { clientWidth, clientHeight } = container;
          setDimensions({ width: clientWidth, height: clientHeight });
          canvasRef.current.width = clientWidth;
          canvasRef.current.height = clientHeight;
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ---------- Draw function ----------
  const draw = useCallback(
    (renderables: Renderable[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { width, height } = canvas;

      // Trail effect
      ctx.fillStyle = 'rgba(5, 5, 16, 0.15)';
      ctx.fillRect(0, 0, width, height);

      for (const r of renderables) {
        // ---- determine if this renderable belongs to a permanent planet ----
        let entityId = '';
        let isPermanent = false;
        let isHighlighted = false;

        if (r.id.includes('-planet')) {
          entityId = r.id.slice(0, r.id.length - '-planet'.length);
          isPermanent = entityId.startsWith('favorite-');
          isHighlighted = highlightedPlanetIds.includes(entityId);
        } else if (r.id.includes('-label')) {
          entityId = r.id.slice(0, r.id.length - '-label'.length);
          isPermanent = entityId.startsWith('favorite-');
          isHighlighted = highlightedPlanetIds.includes(entityId);
        } else if (r.id.includes('-orbit')) {
          entityId = r.id.slice(0, r.id.length - '-orbit'.length);
          isPermanent = entityId.startsWith('favorite-');
          // orbits aren't highlighted separately, just dimmed with the planet
        }

        const isDimmed = isPermanent && !isHighlighted;

        if (r.type === 'particle') {
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.size, 0, Math.PI * 2);
          ctx.fillStyle = r.color;
          ctx.shadowColor = r.color;
          ctx.shadowBlur = 6 + ((r.meta?.speed as number) ?? 0) * 1.5;
          ctx.fill();

          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.size * 0.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (r.type === 'circle') {
          ctx.beginPath();
          if (r.meta?.isOrbit) {
            ctx.strokeStyle = isDimmed ? 'rgba(255,255,255,0.05)' : r.color;
            ctx.lineWidth = r.size || 1;
            ctx.arc(r.x, r.y, r.radius ?? 100, 0, Math.PI * 2);
            ctx.stroke();
          } else {
            // Planet body
            const radius = isDimmed ? r.size * 0.5 : (isHighlighted ? r.size * 1.4 : r.size);
            ctx.globalAlpha = isDimmed ? 0.3 : 1;
            ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = r.color;
            ctx.shadowColor = r.color;
            ctx.shadowBlur = isHighlighted ? 30 : (isDimmed ? 4 : 12);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
          }
        } else if (r.type === 'text') {
          ctx.font = `${r.size || 12}px "Space Mono", monospace`;
          ctx.fillStyle = r.color;
          ctx.globalAlpha = isDimmed ? 0.3 : r.opacity;
          ctx.fillText((r.meta?.text as string) ?? '', r.x, r.y);
          ctx.globalAlpha = 1;
        }
      }

      // Central star
      const cx = width / 2;
      const cy = height / 2;
      const starRadius = 20 + 15 * (gravity / 500) * (0.8 + 0.4 * Math.sin(Date.now() * 0.003));
      const starGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, starRadius);
      starGradient.addColorStop(0, '#ffffff');
      starGradient.addColorStop(0.2, '#fff0c0');
      starGradient.addColorStop(0.6, `hsl(${35 + gravity * 0.02}, 100%, 60%)`);
      starGradient.addColorStop(1, 'rgba(80, 0, 0, 0)');

      ctx.beginPath();
      ctx.arc(cx, cy, starRadius, 0, Math.PI * 2);
      ctx.fillStyle = starGradient;
      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 40 * (gravity / 500);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Optional guide rings
      ctx.strokeStyle = 'rgba(255, 200, 100, 0.06)';
      ctx.lineWidth = 1;
      for (const r of [100, 180, 260]) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    },
    [gravity, highlightedPlanetIds]
  );

  // ---------- Animation loop ----------
  useAnimationFrame((deltaTime) => {
    const engine = engineRef.current;
    const disk = entityRef.current;
    if (!engine || !disk) return;

    // Combine disk entity with any planets from the store
    const entities: CelestialEntity[] = [disk, ...planetEntities];

    // Sub‑steps for stability
    const substeps = 3;
    for (let s = 0; s < substeps; s++) {
      engine.tick(entities, deltaTime / substeps);
    }

    const renderables = engine.getRenderables(entities);
    draw(renderables);
  });

  return (
    <div className={styles.container}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        width={dimensions.width}
        height={dimensions.height}
      />
    </div>
  );
}