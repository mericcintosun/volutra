"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
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

/** The two camera viewpoints. "drawn" looks straight down like the pad; "relief" is low and to the side. */
export type CoilView = "drawn" | "relief";

const VIEWS: Record<CoilView, { position: Vec3; target: Vec3 }> = {
  drawn: { position: [0, 10.4, 0.01], target: [0, 0, 0] },
  relief: { position: [0, 3.1, 8.4], target: [0, 0.25, 0] },
};

/** A tube built from one instanced cylinder per segment of the path. */
function SegmentTube({ path, heat, radius, base, hot }: { path: Vec3[]; heat?: number[]; radius: number; base: THREE.Color; hot: THREE.Color }) {
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
      c.copy(base).lerp(hot, heat ? heat[i] ?? 0 : 0);
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

type OrbitLike = { target: THREE.Vector3; update: () => void };

/**
 * Signature 3 (K6): eases the camera position and target toward the chosen view over
 * about 700 ms, calling invalidate() every frame until it settles. Under
 * prefers-reduced-motion: reduce it snaps to the view in one frame.
 */
function CameraRig({ view, moving }: { view: CoilView; moving: MutableRefObject<boolean> }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as OrbitLike | null;
  const invalidate = useThree((s) => s.invalidate);
  const goalPos = useRef(new THREE.Vector3(...VIEWS[view].position));
  const goalTarget = useRef(new THREE.Vector3(...VIEWS[view].target));
  const lookAt = useRef(new THREE.Vector3(...VIEWS[view].target));
  const reduced = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced.current = mq.matches;
    const onChange = () => {
      reduced.current = mq.matches;
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    goalPos.current.set(...VIEWS[view].position);
    goalTarget.current.set(...VIEWS[view].target);
    if (reduced.current) {
      camera.position.copy(goalPos.current);
      lookAt.current.copy(goalTarget.current);
      if (controls) {
        controls.target.copy(goalTarget.current);
        controls.update();
      } else {
        camera.lookAt(goalTarget.current);
      }
      moving.current = false;
    } else {
      moving.current = true;
    }
    invalidate();
  }, [view, camera, controls, invalidate, moving]);

  useFrame((_, delta) => {
    if (!moving.current) return;
    // exponential damping: about 1 percent of the distance is left after 700 ms
    const k = 1 - Math.exp(-Math.min(delta, 0.1) * 6.5);
    const target = controls ? controls.target : lookAt.current;
    camera.position.lerp(goalPos.current, k);
    target.lerp(goalTarget.current, k);
    const settled = camera.position.distanceTo(goalPos.current) < 0.004 && target.distanceTo(goalTarget.current) < 0.004;
    if (settled) {
      camera.position.copy(goalPos.current);
      target.copy(goalTarget.current);
      moving.current = false;
    }
    if (controls) controls.update();
    else camera.lookAt(target);
    invalidate();
  });

  return null;
}

export interface CoilCanvasProps {
  drawn: Vec3[];
  ideal: Vec3[];
  heat: number[];
  /**
   * Signature 2 (K6): clamp(amplitudeMm / thresholdMm, 0, 1) against today's seeded line.
   * Lerps the tube's base colour from SECOND olive to ACCENT clay; the per-segment heat
   * runs toward BAD only once the reading reaches the line (warmth 1). Omitted: clay with BAD heat.
   */
  warmth?: number;
  view: CoilView;
}

/**
 * The fired-clay coil: the selected spiral raised off a tile, with its tremor
 * exaggerated three times. Renders on demand only; orbit with pointer or touch, or pick
 * a view with the buttons beside the frame.
 */
export function CoilCanvas({ drawn, ideal, heat, warmth, view }: CoilCanvasProps) {
  const t = useTokens();
  const moving = useRef(false);
  const colors = useMemo(() => {
    if (!t) return null;
    const olive = new THREE.Color(t.olive);
    if (warmth === undefined) return { olive, base: new THREE.Color(t.clay), hot: new THREE.Color(t.bad) };
    const w = Math.min(1, Math.max(0, warmth));
    const base = new THREE.Color(t.olive).lerp(new THREE.Color(t.clay), w);
    const hot = w >= 1 ? new THREE.Color(t.bad) : base.clone();
    return { olive, base, hot };
  }, [t, warmth]);

  return (
    <Canvas frameloop="demand" dpr={[1, 2]} camera={{ position: VIEWS[view].position, fov: 40 }} gl={{ antialias: true, alpha: true }}>
      {t && colors && (
        <>
          <ambientLight intensity={2.1} color={t.ink} />
          <directionalLight position={[3, 6, 4]} intensity={2.2} color={t.ink} />
          <mesh position={[0, -0.12, 0]}>
            <boxGeometry args={[7.6, 0.2, 7.6]} />
            <meshStandardMaterial color={t.deep} roughness={1} metalness={0} />
          </mesh>
          <SegmentTube path={ideal} radius={0.025} base={colors.olive} hot={colors.olive} />
          <SegmentTube path={drawn} heat={heat} radius={0.06} base={colors.base} hot={colors.hot} />
          <OrbitControls
            makeDefault
            enablePan={false}
            enableZoom={false}
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2.3}
            onStart={() => {
              moving.current = false;
            }}
          />
          <CameraRig view={view} moving={moving} />
        </>
      )}
    </Canvas>
  );
}
