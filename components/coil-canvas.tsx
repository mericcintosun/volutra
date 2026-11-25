"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { Vec3 } from "@/lib/tremor";

interface Tokens {
  clay: string;
  olive: string;
  bad: string;
  deep: string;
  ink: string;
}

function useTokens(): Tokens | null {
  const [tokens, setTokens] = useState<Tokens | null>(null);
  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const v = (name: string) => cs.getPropertyValue(name).trim();
    setTokens({ clay: v("--primary"), olive: v("--second"), bad: v("--bad"), deep: v("--muted"), ink: v("--foreground") });
  }, []);
  return tokens;
}

/** A tube built from one instanced cylinder per segment of the path. */
function SegmentTube({ path, heat, radius, base, hot }: { path: Vec3[]; heat?: number[]; radius: number; base: string; hot: string }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  const count = Math.max(1, path.length - 1);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh || path.length < 2) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const mid = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const cBase = new THREE.Color(base);
    const cHot = new THREE.Color(hot);
    const c = new THREE.Color();
    for (let i = 0; i < path.length - 1; i++) {
      a.set(...path[i]);
      b.set(...path[i + 1]);
      dir.subVectors(b, a);
      const len = dir.length() || 1e-4;
      dir.divideScalar(len);
      q.setFromUnitVectors(up, dir);
      mid.addVectors(a, b).multiplyScalar(0.5);
      scale.set(1, len * 1.2, 1);
      m.compose(mid, q, scale);
      mesh.setMatrixAt(i, m);
      c.copy(cBase).lerp(cHot, heat ? heat[i] ?? 0 : 0);
      mesh.setColorAt(i, c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    invalidate();
  }, [path, heat, base, hot, invalidate]);

  return (
    <instancedMesh key={count} ref={ref} args={[undefined, undefined, count]}>
      <cylinderGeometry args={[radius, radius, 1, 7]} />
      <meshStandardMaterial roughness={0.95} metalness={0} />
    </instancedMesh>
  );
}

export interface CoilCanvasProps {
  drawn: Vec3[];
  ideal: Vec3[];
  heat: number[];
}

/**
 * The fired-clay coil: the selected spiral raised off a tile, with its tremor
 * exaggerated three times and warmed toward the BAD tone where it strays from the olive
 * Archimedes line. Renders on demand only; orbit with pointer or touch.
 */
export function CoilCanvas({ drawn, ideal, heat }: CoilCanvasProps) {
  const t = useTokens();
  return (
    <Canvas frameloop="demand" dpr={[1, 2]} camera={{ position: [0, 6.2, 5.6], fov: 38 }} gl={{ antialias: true, alpha: true }}>
      {t && (
        <>
          <ambientLight intensity={0.75} color={t.ink} />
          <directionalLight position={[3, 6, 4]} intensity={1.6} color={t.ink} />
          <mesh position={[0, -0.12, 0]}>
            <boxGeometry args={[7.6, 0.2, 7.6]} />
            <meshStandardMaterial color={t.deep} roughness={1} />
          </mesh>
          <SegmentTube path={ideal} radius={0.025} base={t.olive} hot={t.olive} />
          <SegmentTube path={drawn} heat={heat} radius={0.06} base={t.clay} hot={t.bad} />
          <OrbitControls enablePan={false} enableZoom={false} maxPolarAngle={Math.PI / 2.3} minPolarAngle={0.15} />
        </>
      )}
    </Canvas>
  );
}
