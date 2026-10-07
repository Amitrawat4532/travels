"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { RoundedBox } from "@react-three/drei";
import type { Group } from "three";

export type JeepHandle = { group: Group | null; spin: (delta: number) => void };

const BODY = "#f2f0ea";
const TRIM = "#24282b";
const GLASS = "#22313a";

/**
 * Stylised Mahindra-Bolero-style shared jeep — the workhorse of Garhwal
 * roads — with a roof carrier and tarp-covered luggage. Faces +Z.
 */
export const Jeep = forwardRef<JeepHandle, { shadows?: boolean }>(function Jeep({ shadows }, ref) {
  const group = useRef<Group>(null);
  const wheels = useRef<(Group | null)[]>([]);

  useImperativeHandle(ref, () => ({
    get group() {
      return group.current;
    },
    spin(delta: number) {
      for (const w of wheels.current) if (w) w.rotation.x += delta / 0.42;
    },
  }));

  const wheelPositions: [number, number, number][] = [
    [0.92, 0.42, 1.38],
    [-0.92, 0.42, 1.38],
    [0.92, 0.42, -1.32],
    [-0.92, 0.42, -1.32],
  ];

  return (
    <group ref={group}>
      <group position={[0, 0.06, 0]}>
        {/* Lower body */}
        <RoundedBox args={[1.9, 0.92, 4.25]} radius={0.12} smoothness={3} position={[0, 0.98, 0]} castShadow={shadows}>
          <meshStandardMaterial color={BODY} roughness={0.32} metalness={0.2} />
        </RoundedBox>
        {/* Bonnet slope */}
        <RoundedBox args={[1.84, 0.2, 1.25]} radius={0.08} position={[0, 1.47, 1.45]} rotation={[0.06, 0, 0]} castShadow={shadows}>
          <meshStandardMaterial color={BODY} roughness={0.32} metalness={0.2} />
        </RoundedBox>
        {/* Cabin */}
        <RoundedBox args={[1.82, 0.88, 2.95]} radius={0.14} smoothness={3} position={[0, 1.86, -0.5]} castShadow={shadows}>
          <meshStandardMaterial color={BODY} roughness={0.32} metalness={0.2} />
        </RoundedBox>
        {/* Glass */}
        {[0.915, -0.915].map((x) => (
          <mesh key={x} position={[x, 1.93, -0.45]}>
            <boxGeometry args={[0.02, 0.5, 2.55]} />
            <meshStandardMaterial color={GLASS} roughness={0.08} metalness={0.7} />
          </mesh>
        ))}
        <mesh position={[0, 1.92, 0.99]} rotation={[-0.22, 0, 0]}>
          <boxGeometry args={[1.62, 0.6, 0.03]} />
          <meshStandardMaterial color={GLASS} roughness={0.05} metalness={0.75} />
        </mesh>
        <mesh position={[0, 1.95, -1.99]}>
          <boxGeometry args={[1.5, 0.48, 0.03]} />
          <meshStandardMaterial color={GLASS} roughness={0.08} metalness={0.7} />
        </mesh>
        {/* Pillars over the side glass */}
        {[0.925, -0.925].flatMap((x) =>
          [-1.6, -0.55, 0.45].map((z) => (
            <mesh key={`${x}${z}`} position={[x, 1.93, z]}>
              <boxGeometry args={[0.03, 0.52, 0.08]} />
              <meshStandardMaterial color={BODY} roughness={0.35} />
            </mesh>
          )),
        )}
        {/* Forest-green brand stripe */}
        {[0.957, -0.957].map((x) => (
          <mesh key={x} position={[x, 1.08, 0]}>
            <boxGeometry args={[0.01, 0.1, 3.9]} />
            <meshStandardMaterial color="#22593a" roughness={0.5} />
          </mesh>
        ))}
        {/* Grille, bumpers, lights */}
        <mesh position={[0, 1.0, 2.13]}>
          <boxGeometry args={[1.15, 0.36, 0.04]} />
          <meshStandardMaterial color={TRIM} roughness={0.5} metalness={0.4} />
        </mesh>
        {[2.17, -2.17].map((z) => (
          <mesh key={z} position={[0, 0.56, z]} castShadow={shadows}>
            <boxGeometry args={[1.98, 0.24, 0.2]} />
            <meshStandardMaterial color={TRIM} roughness={0.6} />
          </mesh>
        ))}
        {[0.66, -0.66].map((x) => (
          <mesh key={x} position={[x, 1.06, 2.135]}>
            <boxGeometry args={[0.32, 0.18, 0.04]} />
            <meshStandardMaterial color="#fff6dc" emissive="#ffe9b0" emissiveIntensity={1.4} />
          </mesh>
        ))}
        {[0.78, -0.78].map((x) => (
          <mesh key={x} position={[x, 1.12, -2.135]}>
            <boxGeometry args={[0.18, 0.32, 0.04]} />
            <meshStandardMaterial color="#b3261e" emissive="#c2412d" emissiveIntensity={0.8} />
          </mesh>
        ))}
        {/* Spare wheel */}
        <mesh position={[0, 1.15, -2.3]} rotation={[Math.PI / 2, 0, 0]} castShadow={shadows}>
          <cylinderGeometry args={[0.38, 0.38, 0.26, 20]} />
          <meshStandardMaterial color="#1b1d1f" roughness={0.9} />
        </mesh>
        {/* Fender flares */}
        {wheelPositions.map(([x, , z]) => (
          <mesh key={`f${x}${z}`} position={[x * 1.03, 0.86, z]}>
            <boxGeometry args={[0.1, 0.16, 1.05]} />
            <meshStandardMaterial color={TRIM} roughness={0.7} />
          </mesh>
        ))}
        {/* Roof carrier */}
        <group position={[0, 2.37, -0.5]}>
          {[0.8, -0.8].map((x) => (
            <mesh key={x} position={[x, 0, 0]}>
              <boxGeometry args={[0.05, 0.06, 2.7]} />
              <meshStandardMaterial color={TRIM} roughness={0.5} metalness={0.5} />
            </mesh>
          ))}
          {[-1.2, -0.4, 0.4, 1.2].map((z) => (
            <mesh key={z} position={[0, 0, z]}>
              <boxGeometry args={[1.65, 0.04, 0.05]} />
              <meshStandardMaterial color={TRIM} roughness={0.5} metalness={0.5} />
            </mesh>
          ))}
          <RoundedBox args={[1.3, 0.42, 1.35]} radius={0.12} position={[0.05, 0.24, -0.35]} castShadow={shadows}>
            <meshStandardMaterial color="#7a5434" roughness={0.95} />
          </RoundedBox>
          <RoundedBox args={[0.62, 0.34, 0.6]} radius={0.1} position={[-0.3, 0.2, 0.75]} castShadow={shadows}>
            <meshStandardMaterial color="#2f5d8c" roughness={0.85} />
          </RoundedBox>
          <RoundedBox args={[0.5, 0.3, 0.55]} radius={0.1} position={[0.38, 0.18, 0.7]}>
            <meshStandardMaterial color="#c58a2e" roughness={0.85} />
          </RoundedBox>
        </group>
      </group>
      {/* Wheels */}
      {wheelPositions.map((p, i) => (
        <group key={i} position={p}>
          <group
            ref={(el) => {
              wheels.current[i] = el;
            }}
          >
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow={shadows}>
              <cylinderGeometry args={[0.42, 0.42, 0.32, 22]} />
              <meshStandardMaterial color="#1b1d1f" roughness={0.92} />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]} position={[p[0] > 0 ? 0.165 : -0.165, 0, 0]}>
              <cylinderGeometry args={[0.22, 0.22, 0.02, 6]} />
              <meshStandardMaterial color="#c9cdd0" roughness={0.3} metalness={0.8} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
});
