// src/universe/components/Universe3D.tsx
import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { UniverseEngine } from "../engine/UniverseEngine";
import { useUniverseStore } from "../store/universeStore";
import type { CelestialEntity, AccretionDiskData } from "../../lib/types";
import { AccretionDisk3D } from "./AccretionDisk3D";
import { RealisticStarField } from "./RealisticStarField";

// ──────────────────────────── Constants ────────────────────────────
const PIXEL_TO_UNIT = 1 / 28;
const DISK_SPREAD = 280 * PIXEL_TO_UNIT;
const PARTICLE_SIZE = 0.08;
const CENTRAL_STAR_RADIUS = 1.2;
const PLANET_CONFIGS = [
  { radius: 4.5, speed: 0.38 },
  { radius: 6.5, speed: 0.22 },
  { radius: 8.8, speed: 0.13 },
  { radius: 11.2, speed: 0.08 },
  { radius: 13.5, speed: 0.05 },
  { radius: 16.0, speed: 0.03 },
];
const PLANET_SIZES = [0.52, 0.72, 0.88, 0.6, 0.95, 0.65];

// ─────────────────────── Helper: Canvas texture ────────────────────
function createLabelTexture(name: string, color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 64);
  ctx.font = "bold 22px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(name, 128, 32);
  return new THREE.CanvasTexture(canvas);
}

// ─────────────────────────── Scene Lighting ───────────────────────
function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.06} />
      <pointLight
        position={[0, 2, 0]}
        intensity={100}
        color="#ffcc66"
        distance={120}
        decay={2}
      />
      <pointLight
        position={[-30, 15, -20]}
        intensity={12}
        color="#4488cc"
        distance={100}
        decay={2}
      />
      <pointLight
        position={[25, 8, 10]}
        intensity={6}
        color="#ff8844"
        distance={80}
        decay={2}
      />
    </>
  );
}

// ────────────────────────── Central star ──────────────────────────
function CentralStar({ clearTravelTarget }: { clearTravelTarget: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);

  const glowTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, "rgba(255,160,0,1)");
    gradient.addColorStop(0.2, "rgba(255,100,0,0.8)");
    gradient.addColorStop(0.5, "rgba(255,60,0,0.3)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(canvas);
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * 3) * 0.02;
    meshRef.current.scale.setScalar(pulse);
    matRef.current.emissiveIntensity = 1.5 + Math.sin(t * 2) * 0.15;
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          // Return to default view
          clearTravelTarget();
          useUniverseStore.getState().setSelectedPlanetId(null);
        }}
      >
        <sphereGeometry args={[CENTRAL_STAR_RADIUS, 64, 64]} />
        <meshStandardMaterial
          ref={matRef}
          color="#ffaa00"
          emissive="#ff6600"
          emissiveIntensity={1.5}
          roughness={0.5}
          metalness={0}
        />
      </mesh>
      <sprite scale={[4.5, 4.5, 1]}>
        <spriteMaterial
          map={glowTexture}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
    </group>
  );
}

// ──────────────────────── Orbit Ring ──────────────────────────────
function OrbitRing({
  radius,
  color = "#334466",
  opacity = 0.25,
}: {
  radius: number;
  color?: string;
  opacity?: number;
}) {
  const geometry = useMemo(() => {
    const points = [];
    const segments = 256;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          Math.cos(angle) * radius,
          0,
          Math.sin(angle) * radius,
        ),
      );
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [radius]);

  const line = useMemo(() => {
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
    });
    return new THREE.Line(geometry, material);
  }, [color, geometry, opacity]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      (line.material as THREE.Material).dispose();
    };
  }, [geometry, line]);

  return <primitive object={line} />;
}

// ──────────────────────── Planet Label ────────────────────────────
function PlanetLabel({ name, color }: { name: string; color: string }) {
  const texture = useMemo(() => createLabelTexture(name, color), [name, color]);
  useEffect(() => {
    return () => texture.dispose();
  }, [texture]);

  return (
    <sprite position={[0, 1.2, 0]} scale={[1.8, 0.45, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  );
}

// ────────────────────── Highlight Burst Particles ────────────────
function HighlightBurst({
  color,
  planetSize,
  isActive,
}: {
  color: THREE.Color;
  planetSize: number;
  isActive: boolean;
}) {
  const pointsRef = useRef<THREE.Points>(null!);
  const burstDataRef = useRef<{
    velocities: Float32Array;
    life: Float32Array;
    maxLife: number;
  } | null>(null);
  const count = 200;

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [count]);

  useEffect(() => {
    if (!isActive) {
      burstDataRef.current = null;
      return;
    }

    const velocities = new Float32Array(count * 3);
    const life = new Float32Array(count);
    const maxLife = 1.5 + Math.random() * 0.5;
    const posArr = geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 2 + Math.random() * 4;
      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      velocities[i * 3 + 2] = Math.cos(phi) * speed;

      posArr[i * 3] = Math.sin(phi) * Math.cos(theta) * planetSize * 1.2;
      posArr[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * planetSize * 1.2;
      posArr[i * 3 + 2] = Math.cos(phi) * planetSize * 1.2;

      life[i] = maxLife;
    }

    geometry.attributes.position.needsUpdate = true;
    burstDataRef.current = { velocities, life, maxLife };
  }, [isActive, planetSize, geometry, count]);

  useFrame((_, delta) => {
    if (!pointsRef.current || !burstDataRef.current) return;
    const posArr = geometry.attributes.position.array as Float32Array;
    const { velocities, life } = burstDataRef.current;

    for (let i = 0; i < count; i++) {
      if (life[i] <= 0) {
        posArr[i * 3] = 9999;
        posArr[i * 3 + 1] = 9999;
        posArr[i * 3 + 2] = 9999;
        continue;
      }
      life[i] -= delta;
      posArr[i * 3] += velocities[i * 3] * delta;
      posArr[i * 3 + 1] += velocities[i * 3 + 1] * delta;
      posArr[i * 3 + 2] += velocities[i * 3 + 2] * delta;
    }

    geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={0.12}
        color={color}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        transparent
        opacity={0.9}
        sizeAttenuation
      />
    </points>
  );
}

// ────────────────────────── Planet Sphere (updated) ───────────────
function PlanetSphere({
  entity,
  orbitRadius,
  speed,
  phase,
  baseSize,
  clearTravelTarget, // 🆕
}: {
  entity: CelestialEntity & { type: "planet" };
  orbitRadius: number;
  speed: number;
  phase: number;
  baseSize: number;
  clearTravelTarget: () => void; // 🆕
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const meshRef = useRef<THREE.Mesh>(null!);
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);
  const auraRef = useRef<THREE.Mesh>(null!);

  const highlightedPlanetIds = useUniverseStore((s) => s.highlightedPlanetIds);
  const isHighlighted = highlightedPlanetIds.includes(entity.id);
  const prevHighlighted = useRef(false);

  const planetColor = entity.data.color ?? "#88ccff";
  const threeColor = useMemo(() => new THREE.Color(planetColor), [planetColor]);

  const auraTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 128, 128);
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,255,255,0.9)");
    gradient.addColorStop(0.2, "rgba(255,255,255,0.6)");
    gradient.addColorStop(0.6, "rgba(255,255,255,0.1)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }, []);

  useEffect(() => {
    return () => {
      auraTexture.dispose();
    };
  }, [auraTexture]);

  const [triggerBurst, setTriggerBurst] = useState(false);
  useEffect(() => {
    if (isHighlighted && !prevHighlighted.current) {
      setTriggerBurst(true);
      const timer = setTimeout(() => setTriggerBurst(false), 100);
      prevHighlighted.current = true;
      return () => clearTimeout(timer);
    }
    if (!isHighlighted) {
      prevHighlighted.current = false;
    }
  }, [isHighlighted]);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    const angle = phase + time * speed;
    groupRef.current.position.set(
      Math.cos(angle) * orbitRadius,
      0,
      Math.sin(angle) * orbitRadius,
    );

    let targetScale = 1.0;
    let emissiveTarget = 0.0;
    let auraOpacity = 0.0;
    let auraScale = 1.0;

    if (isHighlighted) {
      targetScale = 1.0 + Math.sin(time * 8) * 0.12;
      emissiveTarget = 0.8;
      auraOpacity = 0.5 + Math.sin(time * 6) * 0.15;
      auraScale = 2.2 + Math.sin(time * 5) * 0.4;
    }

    const currentScale = meshRef.current.scale.x;
    meshRef.current.scale.setScalar(
      currentScale + (targetScale - currentScale) * 0.2,
    );
    matRef.current.emissiveIntensity +=
      (emissiveTarget - matRef.current.emissiveIntensity) * 0.15;

    if (auraRef.current) {
      const mat = auraRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity += (auraOpacity - mat.opacity) * 0.15;
      auraRef.current.scale.setScalar(auraScale);
    }
  });

  return (
    <>
      <OrbitRing radius={orbitRadius} />
      <group ref={groupRef}>
        <mesh ref={auraRef} scale={[0.01, 0.01, 0.01]}>
          <sphereGeometry args={[baseSize * 1.6, 32, 32]} />
          <meshBasicMaterial
            map={auraTexture}
            color={threeColor}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            transparent
            opacity={0}
          />
        </mesh>

        {triggerBurst && (
          <HighlightBurst
            color={threeColor}
            planetSize={baseSize}
            isActive={triggerBurst}
          />
        )}

        <mesh
          ref={meshRef}
          onClick={(e) => {
            e.stopPropagation();
            clearTravelTarget(); // 🆕 clear any pending travel
            useUniverseStore.getState().setSelectedPlanetId(entity.id);
          }}
        >
          <sphereGeometry args={[baseSize, 64, 64]} />
          <meshStandardMaterial
            ref={matRef}
            color={threeColor}
            emissive={threeColor}
            emissiveIntensity={0}
            roughness={0.75}
            metalness={0.05}
          />
        </mesh>

        <PlanetLabel name={entity.data.name} color={planetColor} />
      </group>
    </>
  );
}

// ─────────────────────── Camera Controller (updated) ──────────────
function CameraController({
  orbitDataMap,
  travelTargetRef,
  freeFlightRef,
}: {
  orbitDataMap: Map<string, { radius: number; speed: number; phase: number }>;
  travelTargetRef: React.MutableRefObject<THREE.Vector3 | null>;
  freeFlightRef: React.MutableRefObject<boolean>;
}) {
  const selectedPlanetId = useUniverseStore((s) => s.selectedPlanetId);
  const planetEntities = useUniverseStore((s) => s.planetEntities);
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();

  const targetPos = useRef(new THREE.Vector3(0, 7, 18));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));

  const getPlanetWorldPosition = useCallback(
    (planetId: string, time: number) => {
      const planet = planetEntities.find((p) => p.id === planetId);
      const orbit = orbitDataMap.get(planetId);
      if (!planet || !orbit) return null;
      const angle = orbit.phase + time * orbit.speed;
      const x = Math.cos(angle) * orbit.radius;
      const z = Math.sin(angle) * orbit.radius;
      return new THREE.Vector3(x, 0, z);
    },
    [planetEntities, orbitDataMap],
  );

  useFrame(({ clock }) => {
    if (!controlsRef.current) return;
    const time = clock.getElapsedTime();

    if (selectedPlanetId) {
      const worldPos = getPlanetWorldPosition(selectedPlanetId, time);
      if (worldPos) {
        targetLookAt.current.copy(worldPos);
        const offset = new THREE.Vector3(3, 2, 4);
        targetPos.current.copy(worldPos).add(offset);
      }
      travelTargetRef.current = null;
      freeFlightRef.current = false;
    } else if (travelTargetRef.current) {
      const dest = travelTargetRef.current;
      targetLookAt.current.copy(dest);
      const offset = new THREE.Vector3(3, 2, 4);
      targetPos.current.copy(dest).add(offset);

      if (controlsRef.current.target.distanceTo(dest) < 1.0) {
        travelTargetRef.current = null;
        freeFlightRef.current = true;
      }
    } else if (freeFlightRef.current) {
      return;
    } else {
      targetPos.current.set(0, 7, 18);
      targetLookAt.current.set(0, 0, 0);
    }

    if (!freeFlightRef.current) {
      camera.position.lerp(targetPos.current, 0.05);
      controlsRef.current.target.lerp(targetLookAt.current, 0.08);
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={3}
      maxDistance={80}
    />
  );
}

// ───────────────────── Background Deselect Plane (updated) ────────
function DeselectPlane({
  travelTargetRef,
  freeFlightRef,
}: {
  travelTargetRef: React.MutableRefObject<THREE.Vector3 | null>;
  freeFlightRef: React.MutableRefObject<boolean>;
}) {
  const setSelectedPlanetId = useUniverseStore((s) => s.setSelectedPlanetId);

  return (
    <mesh
      position={[0, 0, -10]}
      onClick={(e) => {
        travelTargetRef.current = e.point.clone();
        freeFlightRef.current = false;
        setSelectedPlanetId(null);
      }}
    >
      <planeGeometry args={[1000, 1000]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
}

// ─────────────────────────── Scene Content (updated) ──────────────
function SceneContent() {
  const planetEntities = useUniverseStore((s) => s.planetEntities);
  const gravity = useUniverseStore((s) => s.gravity);

  const engineRef = useRef<UniverseEngine | null>(null);
  const [diskEntity, setDiskEntity] = useState<CelestialEntity | null>(null);

  const travelTargetRef = useRef<THREE.Vector3 | null>(null);
  const freeFlightRef = useRef(false);

  const clearTravelTarget = () => {
    travelTargetRef.current = null;
    freeFlightRef.current = false;
  };

  // Create engine / disk once (unchanged)
  useEffect(() => {
    const engine = new UniverseEngine({
      canvasWidth: 800,
      canvasHeight: 600,
      globalGravity: gravity,
    });
    engineRef.current = engine;

    const particleCount = 900;
    const spreadRadius = 280;
    const diskData: AccretionDiskData = {
      particleCount,
      spreadRadius,
      particles: {
        x: new Float32Array(particleCount),
        y: new Float32Array(particleCount),
        vx: new Float32Array(particleCount),
        vy: new Float32Array(particleCount),
      },
    };

    const minRadius = 25;
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const radius =
        minRadius + (spreadRadius - minRadius) * Math.sqrt(Math.random());
      diskData.particles.x[i] = radius * Math.cos(angle);
      diskData.particles.y[i] = radius * Math.sin(angle);
      const vCirc = Math.sqrt((gravity * 1.0) / radius) * 50;
      const ecc = 0.7 + Math.random() * 0.6;
      diskData.particles.vx[i] = -Math.sin(angle) * vCirc * ecc;
      diskData.particles.vy[i] = Math.cos(angle) * vCirc * ecc;
    }

    setDiskEntity({
      id: "sentiment-disk",
      type: "accretionDisk",
      position: { x: 0, y: 0 },
      data: diskData,
    });
  }, []); // eslint-disable-line

  useEffect(() => {
    engineRef.current?.setConfig({ globalGravity: gravity });
  }, [gravity]);

  useFrame((_, delta) => {
    if (!engineRef.current || !diskEntity) return;
    const safeDelta = Math.min(delta, 0.1);
    const entities: CelestialEntity[] = [diskEntity, ...planetEntities];
    const substeps = 3;
    for (let s = 0; s < substeps; s++) {
      engineRef.current.tick(entities, safeDelta / substeps);
    }
  });

  const planets = planetEntities.filter((e) => e.type === "planet");

  const planetOrbitMap = useMemo(() => {
    const map = new Map<
      string,
      { radius: number; speed: number; phase: number }
    >();
    planets.forEach((planet, idx) => {
      const cfg = PLANET_CONFIGS[idx % PLANET_CONFIGS.length];
      map.set(planet.id, {
        radius: cfg.radius,
        speed: cfg.speed,
        phase: (idx * 1.8) % (Math.PI * 2),
      });
    });
    return map;
  }, [planets]);

  return (
    <>
      <color attach="background" args={["#020210"]} />
      <SceneLights />
      <CameraController
        orbitDataMap={planetOrbitMap}
        travelTargetRef={travelTargetRef}
        freeFlightRef={freeFlightRef}
      />
      <RealisticStarField starCount={2000} sphereRadius={200} baseSize={0.4} />
      <CentralStar clearTravelTarget={clearTravelTarget} />
      {diskEntity && (
        <AccretionDisk3D
          entity={diskEntity as CelestialEntity & { type: "accretionDisk" }}
        />
      )}

      {planets.map((planet) => {
        const orbit = planetOrbitMap.get(planet.id);
        if (!orbit) return null;
        return (
          <PlanetSphere
            key={planet.id}
            entity={planet as CelestialEntity & { type: "planet" }}
            orbitRadius={orbit.radius}
            speed={orbit.speed}
            phase={orbit.phase}
            baseSize={
              PLANET_SIZES[parseInt(planet.id.slice(-1)) % PLANET_SIZES.length]
            }
            clearTravelTarget={clearTravelTarget} // 🆕
          />
        );
      })}

      <DeselectPlane
        travelTargetRef={travelTargetRef}
        freeFlightRef={freeFlightRef}
      />
    </>
  );
}

export function Universe3D() {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "absolute",
        top: 0,
        left: 0,
      }}
    >
      <Canvas
        camera={{ position: [0, 7, 18], fov: 50, near: 0.1, far: 1000 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
      >
        <SceneContent />
      </Canvas>
    </div>
  );
}
