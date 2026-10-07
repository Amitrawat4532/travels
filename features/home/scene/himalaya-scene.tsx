"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  DirectionalLight,
  InstancedMesh,
  Object3D,
  PlaneGeometry,
  SphereGeometry,
  Vector3,
  type Group,
  type Points,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { distToRoad, fbm, floorHeight, heightAt, mulberry32, ridgeHeight, roadCurve, smoothstep, terrainColor } from "./terrain";
import { Jeep, type JeepHandle } from "./jeep";

export type SceneProgress = { scroll: number; intro: number; pointerX: number; pointerY: number };
type Quality = "high" | "low";

const HORIZON = "#ebe6da";

/* ───────── Terrain ───────── */

function Terrain({ quality }: { quality: Quality }) {
  const geometry = useMemo(() => {
    const segX = quality === "high" ? 190 : 90;
    const segZ = quality === "high" ? 210 : 100;
    const g = new PlaneGeometry(250, 300, segX, segZ);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, -55);
    const pos = g.attributes.position as BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const c = new Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const d = distToRoad(x, z);
      const h = heightAt(x, z, d);
      pos.setY(i, h);
      terrainColor(x, z, h, d, c);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [quality]);

  return (
    <mesh geometry={geometry} receiveShadow={quality === "high"}>
      <meshStandardMaterial vertexColors roughness={0.95} metalness={0} />
    </mesh>
  );
}

function FarRidges({ quality }: { quality: Quality }) {
  const layers = useMemo(() => {
    const seg = quality === "high" ? 180 : 80;
    return [
      { z: -215, seed: 3.3, tint: "#5f7486", scale: 1.0, y: -6 },
      { z: -265, seed: 8.1, tint: "#7d8fa0", scale: 1.25, y: -10 },
      { z: -320, seed: 15.7, tint: "#9cabb8", scale: 1.5, y: -14 },
    ].map((l) => {
      const g = new PlaneGeometry(700, 70, seg, 12);
      g.rotateX(-Math.PI / 2);
      const pos = g.attributes.position as BufferAttribute;
      const colors = new Float32Array(pos.count * 3);
      const base = new Color(l.tint);
      const snow = new Color("#f6f5f1");
      const c = new Color();
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const edge = smoothstep(35, 10, Math.abs(z)); // taper front/back edges
        const h = ridgeHeight(x, z, l.seed) * l.scale * edge;
        pos.setY(i, h);
        const snowLine = 52 * l.scale + fbm(x * 0.05, z * 0.05) * 14;
        c.copy(base).lerp(snow, smoothstep(snowLine, snowLine + 10, h));
        colors.set([c.r, c.g, c.b], i * 3);
      }
      g.setAttribute("color", new BufferAttribute(colors, 3));
      g.computeVertexNormals();
      return { ...l, g };
    });
  }, [quality]);

  return (
    <>
      {layers.map((l) => (
        <mesh key={l.z} geometry={l.g} position={[0, l.y, l.z]}>
          <meshStandardMaterial vertexColors roughness={1} />
        </mesh>
      ))}
    </>
  );
}

function Sky() {
  const geometry = useMemo(() => {
    const g = new SphereGeometry(480, 32, 16);
    const pos = g.attributes.position as BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const top = new Color("#9fbcd0");
    const mid = new Color("#d5dfe3");
    const horizon = new Color(HORIZON);
    const c = new Color();
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 480;
      if (y > 0.25) c.copy(mid).lerp(top, smoothstep(0.25, 0.9, y));
      else c.copy(horizon).lerp(mid, smoothstep(-0.05, 0.25, y));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new BufferAttribute(colors, 3));
    return g;
  }, []);
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial vertexColors side={BackSide} fog={false} toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

/* ───────── Road ───────── */

function Road() {
  const { surface, dashes } = useMemo(() => {
    const samples = 420;
    const width = 3.4;
    const verts: number[] = [];
    const idx: number[] = [];
    const up = new Vector3(0, 1, 0);
    const side = new Vector3();
    const dashGeos: BufferGeometry[] = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const p = roadCurve.getPointAt(t);
      const tan = roadCurve.getTangentAt(t);
      side.crossVectors(up, tan).normalize();
      for (const s of [-1, 1]) {
        const x = p.x + side.x * (width / 2) * s;
        const z = p.z + side.z * (width / 2) * s;
        verts.push(x, floorHeight(x, z) + 0.14, z);
      }
      if (i < samples) {
        const a = i * 2;
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
      if (i % 6 === 0) {
        const dash = new PlaneGeometry(0.14, 1.2);
        dash.rotateX(-Math.PI / 2);
        dash.rotateY(Math.atan2(tan.x, tan.z));
        dash.translate(p.x, floorHeight(p.x, p.z) + 0.17, p.z);
        dashGeos.push(dash);
      }
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(verts), 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return { surface: g, dashes: mergeGeometries(dashGeos) };
  }, []);

  return (
    <group>
      <mesh geometry={surface} receiveShadow>
        <meshStandardMaterial color="#3b3f42" roughness={0.88} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
      {dashes && (
        <mesh geometry={dashes}>
          <meshStandardMaterial color="#efe6c8" roughness={0.7} polygonOffset polygonOffsetFactor={-4} />
        </mesh>
      )}
    </group>
  );
}

/* ───────── Deodar forest ───────── */

function Forest({ quality }: { quality: Quality }) {
  const ref = useRef<InstancedMesh>(null);
  const count = quality === "high" ? 900 : 320;
  const geometry = useMemo(() => {
    const a = new ConeGeometry(1.25, 3.2, 7);
    a.translate(0, 2.3, 0);
    const b = new ConeGeometry(0.9, 2.5, 7);
    b.translate(0, 3.9, 0);
    const c = new ConeGeometry(0.55, 1.8, 6);
    c.translate(0, 5.2, 0);
    return mergeGeometries([a, b, c]);
  }, []);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const rand = mulberry32(42);
    const o = new Object3D();
    const col = new Color();
    const palette = ["#23452d", "#2c5236", "#335c3b", "#1f3d29", "#3a6640"].map((h) => new Color(h));
    let placed = 0;
    for (let tries = 0; tries < count * 8 && placed < count; tries++) {
      const x = (rand() - 0.5) * 230;
      const z = 42 - rand() * 240;
      const d = distToRoad(x, z);
      if (d < 7.5) continue;
      const h = heightAt(x, z, d);
      const rel = h - floorHeight(x, z);
      if (rel > 24 + fbm(x * 0.05, z * 0.05) * 6) continue;
      if (fbm(x * 0.06 + 7, z * 0.06) < 0.42) continue; // natural clearings
      const s = 0.45 + rand() * 0.6;
      o.position.set(x, h - 0.3, z);
      o.rotation.set(0, rand() * Math.PI, 0);
      o.scale.set(s, s * (0.9 + rand() * 0.5), s);
      o.updateMatrix();
      mesh.setMatrixAt(placed, o.matrix);
      col.copy(palette[Math.floor(rand() * palette.length)]!);
      mesh.setColorAt(placed, col);
      placed++;
    }
    mesh.count = placed;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [count]);

  return (
    <instancedMesh ref={ref} args={[geometry, undefined, count]} frustumCulled={false}>
      <meshStandardMaterial roughness={0.9} flatShading />
    </instancedMesh>
  );
}

/* ───────── Atmosphere ───────── */

function useSoftTexture() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.45, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new CanvasTexture(canvas);
  }, []);
}

function Mist({ quality }: { quality: Quality }) {
  const tex = useSoftTexture();
  const group = useRef<Group>(null);
  const banks = useMemo(() => {
    const rand = mulberry32(7);
    const n = quality === "high" ? 14 : 7;
    return Array.from({ length: n }, (_, i) => {
      const z = 20 - i * 16 - rand() * 8;
      const x = (rand() - 0.5) * 70;
      return { x, z, y: floorHeight(x, z) + 6 + rand() * 10, s: 40 + rand() * 40, o: 0.22 + rand() * 0.2, speed: 0.3 + rand() * 0.5 };
    });
  }, [quality]);

  useFrame((_, dt) => {
    group.current?.children.forEach((c, i) => {
      c.position.x += banks[i]!.speed * dt;
      if (c.position.x > 60) c.position.x = -60;
    });
  });

  return (
    <group ref={group}>
      {banks.map((b, i) => (
        <sprite key={i} position={[b.x, b.y, b.z]} scale={[b.s, b.s * 0.32, 1]}>
          <spriteMaterial map={tex} transparent opacity={b.o} depthWrite={false} color="#f7f4ec" />
        </sprite>
      ))}
    </group>
  );
}

function Particles({ quality }: { quality: Quality }) {
  const ref = useRef<Points>(null);
  const tex = useSoftTexture();
  const geometry = useMemo(() => {
    const n = quality === "high" ? 420 : 160;
    const rand = mulberry32(99);
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (rand() - 0.5) * 80;
      arr[i * 3 + 1] = 2 + rand() * 22;
      arr[i * 3 + 2] = 60 - rand() * 120;
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(arr, 3));
    return g;
  }, [quality]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.elapsedTime * 0.01;
    ref.current.position.y = Math.sin(clock.elapsedTime * 0.3) * 0.6;
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial map={tex} size={0.35} sizeAttenuation transparent opacity={0.55} depthWrite={false} color="#fff8e6" blending={AdditiveBlending} />
    </points>
  );
}

function SunGlow() {
  const tex = useSoftTexture();
  return (
    <sprite position={[140, 120, -380]} scale={[220, 220, 1]}>
      <spriteMaterial map={tex} color="#fff1cf" transparent opacity={0.85} depthWrite={false} fog={false} toneMapped={false} />
    </sprite>
  );
}

/* ───────── Vehicle + camera rig ───────── */

const ROAD_LENGTH = roadCurve.getLength();
const UP = new Vector3(0, 1, 0);
const HERO = {
  landscape: { pos: new Vector3(-3, 15, 78), target: new Vector3(8, 9, 0) },
  portrait: { pos: new Vector3(-2, 16, 84), target: new Vector3(5, 9, 4) },
};
const AERIAL = { pos: new Vector3(6, 70, 52), target: new Vector3(0, 4, -70) };
const WIDE = { pos: new Vector3(0, 58, 90), target: new Vector3(0, 26, -160) };
// Per-frame scratch vectors (module scope: no allocations in the render loop).
const SCRATCH = {
  p: new Vector3(),
  ahead: new Vector3(),
  tan: new Vector3(),
  side: new Vector3(),
  pos: new Vector3(),
  target: new Vector3(),
  b: new Vector3(),
  bt: new Vector3(),
};

function Rig({ progress, quality }: { progress: RefObject<SceneProgress>; quality: Quality }) {
  const jeep = useRef<JeepHandle>(null);
  const sun = useRef<DirectionalLight>(null);
  const state = useRef({ t: 0.1, camPos: new Vector3(0, 58, 90), camTarget: new Vector3(0, 26, -160) });

  useFrame(({ camera, size }, rawDt) => {
    const v = SCRATCH;
    const dt = Math.min(rawDt, 0.05);
    const pr = progress.current;
    const s = pr?.scroll ?? 0;
    const intro = pr?.intro ?? 1;
    const portrait = size.width < size.height;

    // Vehicle: steady ~32 km/h feel; scrolling nudges it forward.
    const st = state.current;
    st.t = (st.t + (dt * 2.6) / ROAD_LENGTH) % 1;
    const t = (st.t + s * 0.18) % 1;
    roadCurve.getPointAt(t, v.p);
    roadCurve.getPointAt(Math.min(t + 0.004, 1), v.ahead);
    v.p.y = floorHeight(v.p.x, v.p.z) + 0.14;
    v.ahead.y = floorHeight(v.ahead.x, v.ahead.z) + 0.14;
    const g = jeep.current?.group;
    if (g) {
      g.position.copy(v.p);
      g.lookAt(v.ahead);
      jeep.current?.spin(dt * 2.6);
    }
    if (sun.current) {
      sun.current.position.set(v.p.x + 30, v.p.y + 45, v.p.z + 22);
      sun.current.target.position.copy(v.p);
      sun.current.target.updateMatrixWorld();
    }

    // Camera keyframes.
    roadCurve.getTangentAt(t, v.tan);
    v.side.set(v.tan.z, 0, -v.tan.x).normalize();
    const hero = portrait ? HERO.portrait : HERO.landscape;
    const followPos = v.b.copy(v.p).addScaledVector(v.tan, -12).addScaledVector(v.side, 2.5).addScaledVector(UP, 5.5);
    const followTarget = v.bt.copy(v.p).addScaledVector(UP, 1.2).addScaledVector(v.tan, 6);

    const k1 = smoothstep(0.18, 0.5, s);
    const k2 = smoothstep(0.72, 0.98, s);
    v.pos.copy(hero.pos).lerp(followPos, k1).lerp(AERIAL.pos, k2);
    v.target.copy(hero.target).lerp(followTarget, k1).lerp(AERIAL.target, k2);

    // Intro: wide Himalaya → settle on the valley.
    v.pos.lerpVectors(WIDE.pos, v.pos, intro);
    v.target.lerpVectors(WIDE.target, v.target, intro);

    // Gentle pointer parallax (desktop only).
    if (quality === "high" && pr) {
      v.pos.x += pr.pointerX * 2.2;
      v.pos.y += pr.pointerY * 1.2;
    }

    const k = 1 - Math.exp(-dt * 3.5);
    st.camPos.lerp(v.pos, k);
    st.camTarget.lerp(v.target, k);
    camera.position.copy(st.camPos);
    camera.lookAt(st.camTarget);
  });

  return (
    <>
      <directionalLight
        ref={sun}
        intensity={2.4}
        color="#ffe8c4"
        castShadow={quality === "high"}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-bias={-0.0004}
      />
      <Jeep ref={jeep} shadows={quality === "high"} />
    </>
  );
}

function FirstFrame({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (!done.current) {
      done.current = true;
      requestAnimationFrame(onReady);
    }
  });
  return null;
}

export default function HimalayaScene({
  progress,
  active,
  quality,
  onReady,
}: {
  progress: RefObject<SceneProgress>;
  active: boolean;
  quality: Quality;
  onReady: () => void;
}) {
  const [dpr, setDpr] = useState(quality === "high" ? 1.75 : 1.25);
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, dpr]}
      shadows={quality === "high"}
      camera={{ fov: quality === "high" ? 46 : 58, near: 0.5, far: 1100, position: [0, 58, 90] }}
      gl={{ antialias: quality === "high", powerPreference: "high-performance", stencil: false }}
      aria-hidden
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} />
      <fog attach="fog" args={[HORIZON, 70, 460]} />
      <Sky />
      <SunGlow />
      <hemisphereLight args={["#e3ecf2", "#3d4a30", 1.1]} />
      <ambientLight intensity={0.15} />
      <FarRidges quality={quality} />
      <Terrain quality={quality} />
      <Road />
      <Forest quality={quality} />
      <Mist quality={quality} />
      <Particles quality={quality} />
      <Rig progress={progress} quality={quality} />
      <FirstFrame onReady={onReady} />
    </Canvas>
  );
}

