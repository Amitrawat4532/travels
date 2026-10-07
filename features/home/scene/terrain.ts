/**
 * Procedural Himalayan valley: deterministic noise, a winding road carved into
 * the valley floor, and helpers shared by terrain, road, trees and vehicle.
 */
import { CatmullRomCurve3, Color, Vector3 } from "three";

function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function noise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x: number, y: number, octaves = 5) {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x * freq, y * freq);
    freq *= 2.03;
    amp *= 0.5;
  }
  return sum;
}

export function ridged(x: number, y: number, octaves = 4) {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(noise(x * freq, y * freq) * 2 - 1);
    sum += amp * n * n;
    freq *= 2.1;
    amp *= 0.5;
  }
  return sum;
}

export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
};

/* ───────── Road ───────── */

// Starts behind the hero camera so the vehicle never visibly "pops" when it loops.
const ROAD_XZ: [number, number][] = [
  [-4, 95],
  [2, 70],
  [10, 48],
  [-2, 30],
  [9, 12],
  [-8, -6],
  [5, -24],
  [-9, -44],
  [6, -64],
  [-5, -86],
  [3, -112],
  [-2, -140],
];

export const roadCurve = new CatmullRomCurve3(
  ROAD_XZ.map(([x, z]) => new Vector3(x, 0, z)),
  false,
  "centripetal",
);
const ROAD_SAMPLES = roadCurve.getSpacedPoints(260).map((p) => [p.x, p.z] as const);

export function distToRoad(x: number, z: number) {
  let best = Infinity;
  for (const [sx, sz] of ROAD_SAMPLES) {
    const dx = x - sx;
    const dz = z - sz;
    const d = dx * dx + dz * dz;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

/** Valley floor height — the road sits exactly on it. */
export function floorHeight(x: number, z: number) {
  return (fbm(x * 0.02 + 3.1, z * 0.02) - 0.5) * 2.2 + Math.max(0, -z) * 0.05;
}

export function heightAt(x: number, z: number, d = distToRoad(x, z)) {
  const base = floorHeight(x, z);
  const mountain = fbm(x * 0.017 + 11, z * 0.017, 5) * 40 + ridged(x * 0.028, z * 0.028) * 16;
  const wall = smoothstep(5, 42, d);
  return base + wall * (mountain + d * 0.22);
}

/* ───────── Colours (linear, ready for vertex colours) ───────── */

const C = {
  dirt: new Color("#9a8a6c"),
  meadow: new Color("#7f9a58"),
  meadowDark: new Color("#5f7f45"),
  forest: new Color("#2c5236"),
  forestLight: new Color("#3f6b44"),
  rock: new Color("#6f6a5d"),
  rockDark: new Color("#57534a"),
  snow: new Color("#f3f2ec"),
};

const tmp = new Color();

export function terrainColor(x: number, z: number, h: number, d: number, out: Color) {
  const n = fbm(x * 0.09, z * 0.09, 3);
  if (d < 3.6) return out.copy(C.dirt).lerp(C.meadow, smoothstep(2.2, 3.6, d));
  const wall = smoothstep(5, 42, d);
  if (wall < 0.22) return out.copy(C.meadow).lerp(C.meadowDark, n);
  const rel = h - floorHeight(x, z);
  if (rel < 20) return out.copy(C.forest).lerp(C.forestLight, n).lerp(tmp.copy(C.meadowDark), 0.25 * (1 - wall));
  const snowLine = 33 + n * 8;
  if (rel < snowLine) return out.copy(C.rock).lerp(C.rockDark, n);
  return out.copy(C.rock).lerp(C.snow, smoothstep(snowLine, snowLine + 4, rel));
}

/** Far Himalayan ridge silhouettes. */
export function ridgeHeight(x: number, z: number, seed: number) {
  return ridged(x * 0.011 + seed, z * 0.02 + seed * 0.5, 5) * 85 + fbm(x * 0.02 + seed, z * 0.02) * 25;
}

/** Seeded PRNG for scattering. */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
