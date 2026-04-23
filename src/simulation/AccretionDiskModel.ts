// src/simulation/AccretionDiskModel.ts

export interface ParticleData {
    x: Float32Array;
    y: Float32Array;
    vx: Float32Array;
    vy: Float32Array;
    count: number;
}

export class AccretionDiskModel {
    // ---------- Properties ----------
    private G: number = 0.5;
    private readonly STAR_MASS: number = 1.0;
    private readonly MIN_DISTANCE: number = 5.0;

    private readonly particleCount: number;

    // Particle state stored in typed arrays for performance
    private readonly x: Float32Array;
    private readonly y: Float32Array;
    private readonly vx: Float32Array;
    private readonly vy: Float32Array;

    // ---------- Constructor ----------
    constructor(particleCount: number = 500, spreadRadius: number = 200) {
        this.particleCount = particleCount;

        // Allocate contiguous memory for particles
        this.x = new Float32Array(particleCount);
        this.y = new Float32Array(particleCount);
        this.vx = new Float32Array(particleCount);
        this.vy = new Float32Array(particleCount);

        this.resetParticles(spreadRadius);
    }

    // ---------- Public Methods ----------

    /**
     * Reinitialize all particles in a ring/disk distribution
     * with approximately circular starting velocities.
     */
    public resetParticles(spreadRadius: number = 200): void {
        const minRadius = 25; // Prevent division by zero and keep particles away from singularity
        for (let i = 0; i < this.particleCount; i++) {
            const angle = Math.random() * 2 * Math.PI;
            // Non-uniform distribution (more particles near center)
            const radius = minRadius + (spreadRadius - minRadius) * Math.sqrt(Math.random());

            this.x[i] = radius * Math.cos(angle);
            this.y[i] = radius * Math.sin(angle);

            // Circular orbit speed
            const vCirc = Math.sqrt((this.G * this.STAR_MASS) / radius);

            // Tangent direction
            const tx = -Math.sin(angle);
            const ty = Math.cos(angle);

            // Add eccentricity: 0.7 ~ 1.3 times the circular speed
            const eccentricity = 0.7 + Math.random() * 0.6;

            this.vx[i] = tx * vCirc * eccentricity;
            this.vy[i] = ty * vCirc * eccentricity;
        }
    }

    /**
     * Map a sentiment score (-1 to 1) to the gravitational constant G.
     * Range maps to 0.2 (weak, sad) -> 1.2 (strong, happy)
     */
    public setGravityFromSentiment(score: number): void {
        // Clamp between -1 and 1
        const clamped = Math.max(-1, Math.min(1, score));
        this.G = 0.5 + clamped * 0.7;
    }

    /**
     * Advance the simulation by deltaTime seconds.
     * Uses Symplectic Euler integration (velocity first, then position).
     */
    public tick(deltaTime: number): void {
    for (let i = 0; i < this.particleCount; i++) {
        // Vector from particle to center (0,0)
        const dx = -this.x[i];
        const dy = -this.y[i];
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        // Handle particles that have fallen into the star
        if (dist < this.MIN_DISTANCE) {
            // Respawn at outer edge of disk
            const angle = Math.random() * 2 * Math.PI;
            const radius = 150 + Math.random() * 150; // Outer region
            
            this.x[i] = Math.cos(angle) * radius;
            this.y[i] = Math.sin(angle) * radius;
            
            const vCirc = Math.sqrt((this.G * this.STAR_MASS) / radius);
            const tx = -Math.sin(angle);
            const ty = Math.cos(angle);
            const eccentricity = 0.7 + Math.random() * 0.6;
            
            this.vx[i] = tx * vCirc * eccentricity;
            this.vy[i] = ty * vCirc * eccentricity;
            
            continue; // Skip force application for this frame
        }

        // Gravitational force magnitude: F = G * M / r^2
        const force = (this.G * this.STAR_MASS) / distSq;
        
        // Acceleration components (direction toward center)
        const ax = (dx / dist) * force;
        const ay = (dy / dist) * force;

        // Symplectic Euler: Update velocity first, then position
        this.vx[i] += ax * deltaTime;
        this.vy[i] += ay * deltaTime;
        this.x[i] += this.vx[i] * deltaTime;
        this.y[i] += this.vy[i] * deltaTime;
    }
}

    /**
     * Return a read-only view of particle data for rendering.
     */
    public getParticleData(): ParticleData {
        return {
            x: this.x,
            y: this.y,
            vx: this.vx,
            vy: this.vy,
            count: this.particleCount,
        };
    }

    /**
     * Directly set the gravitational constant (for debugging / slider testing).
     */
    public setGravity(value: number): void {
        this.G = value;
    }

    /**
     * Get current gravitational constant.
     */
    public getGravity(): number {
        return this.G;
    }
}