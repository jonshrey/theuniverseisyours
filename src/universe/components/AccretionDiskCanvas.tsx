// src/universe/components/AccretionDiskCanvas.tsx
import { useRef, useEffect, useState, useCallback } from 'react';
import { AccretionDiskModel } from '../../simulation/AccretionDiskModel';
import { useAnimationFrame } from '../engine/useAnimationFrame';
import { useUniverseStore } from '../store/universeStore';
import styles from './AccretionDiskCanvas.module.css';

export function AccretionDiskCanvas() {
    // ---------- Refs ----------
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const modelRef = useRef<AccretionDiskModel | null>(null);
    
    // ---------- Canvas dimensions ----------
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

    // ---------- Zustand: subscribe to gravity (derived from sentiment) ----------
    const gravity = useUniverseStore((state) => state.gravity);

    // ---------- Initialize model + resize handler ----------
    useEffect(() => {
        // Create the physics model (600 particles, initial spread radius 220)
        modelRef.current = new AccretionDiskModel(800, 280);

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

    // ---------- Sync gravity from store to model ----------
    useEffect(() => {
        if (modelRef.current) {
            modelRef.current.setGravity(gravity);
        }
    }, [gravity]);

    // ---------- Draw function (canvas imperative paint) ----------
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const model = modelRef.current;
        if (!canvas || !model) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height } = canvas;
        const cx = width / 2;
        const cy = height / 2;

        // 1. Trail effect: fade previous frame instead of full clear
        ctx.fillStyle = 'rgba(5, 5, 16, 0.15)';
        ctx.fillRect(0, 0, width, height);

        // 2. Draw particles
        const data = model.getParticleData();
        const { x, y, vx, vy, count } = data;

        for (let i = 0; i < count; i++) {
            const px = cx + x[i];
            const py = cy + y[i];

            // Skip if far outside viewport (performance)
            if (px < -60 || px > width + 60 || py < -60 || py > height + 60) continue;

            const dx = x[i];
            const dy = y[i];
            const dist = Math.sqrt(dx * dx + dy * dy);
            const speed = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]);

            // Color: inner disk = hot (orange/white), outer = cool (blue)
            const tempFactor = Math.max(0, 1 - dist / 300);
            const hue = 200 + tempFactor * 160; // 200 (blue) → 360 (red/orange)
            const sat = 70 + tempFactor * 30;
            const light = 50 + tempFactor * 30 + Math.min(speed * 2, 30);

            ctx.beginPath();
            const particleSize = 2.5 + tempFactor * 2.5;

            // Glow effect for inner, fast particles
            ctx.shadowColor = `hsl(${hue}, ${sat}%, ${light}%)`;
            ctx.shadowBlur = 6 + speed * 1.5;
            ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;
            ctx.arc(px, py, particleSize, 0, Math.PI * 2);
            ctx.fill();

            // Bright core in each particle
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.beginPath();
            ctx.arc(px, py, particleSize * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }

        // 3. Central star (glow intensity scales with gravity)
        const G = model.getGravity();
        const pulse = 0.8 + 0.4 * Math.sin(Date.now() * 0.003);
        const glowRadius = 20 + 15 * (G / 500) * pulse; // gravity‑responsive size

        const starGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
        starGradient.addColorStop(0, '#ffffff');
        starGradient.addColorStop(0.2, '#fff0c0');
        starGradient.addColorStop(0.6, `hsl(${35 + G * 0.02}, 100%, 60%)`);
        starGradient.addColorStop(1, 'rgba(80, 0, 0, 0)');

        ctx.beginPath();
        ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = starGradient;
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = 40 * (G / 500);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 4. Subtle disk guide rings (just for visual depth)
        ctx.strokeStyle = 'rgba(255, 200, 100, 0.06)';
        ctx.lineWidth = 1;
        for (const r of [100, 180, 260]) {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
        }
    }, []);

    // ---------- Animation loop hook ----------
    useAnimationFrame((deltaTime) => {
        if (!modelRef.current) return;

        // Physics substeps for stability
        const substeps = 2;
        for (let s = 0; s < substeps; s++) {
            modelRef.current.tick(deltaTime / substeps);
        }

        draw();
    });

    // ---------- JSX ----------
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