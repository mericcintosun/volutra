"use client";

import { useCallback, useEffect, useRef } from "react";
import type { TracePoint } from "@/lib/tremor";

export const PAD_SIZE = 360;
const MAX_R_PX = 150;
const TURNS = 3;
// CSS pixels are 1/96 inch, so a drawing measured in CSS px converts to real millimetres
const MM_PER_PX = 25.4 / 96;

interface Palette {
  guide: string;
  ink: string;
  clay: string;
}

function readPalette(): Palette {
  const cs = getComputedStyle(document.documentElement);
  return {
    guide: cs.getPropertyValue("--second").trim(),
    ink: cs.getPropertyValue("--border").trim(),
    clay: cs.getPropertyValue("--primary").trim(),
  };
}

interface SpiralPadProps {
  mode: "capture" | "replay";
  /** replay only: the recording to redraw at its own speed */
  trace?: TracePoint[];
  /** replay only: bump this number to start a replay */
  playToken?: number;
  onStart?: () => void;
  onComplete: (points: TracePoint[]) => void;
}

/**
 * The guide spiral and the pen. In capture mode it records pointer events (including
 * coalesced ones, which browsers batch between frames) as timestamped millimetre points.
 * In replay mode it redraws a recording in real time.
 */
export function SpiralPad({ mode, trace, playToken = 0, onStart, onComplete }: SpiralPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<TracePoint[]>([]);
  const drawingRef = useRef(false);
  const t0Ref = useRef(0);
  const paletteRef = useRef<Palette | null>(null);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  const prepare = useCallback((): CanvasRenderingContext2D | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    if (!paletteRef.current) paletteRef.current = readPalette();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = PAD_SIZE * dpr;
    canvas.height = PAD_SIZE * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, PAD_SIZE, PAD_SIZE);

    const c = PAD_SIZE / 2;
    const b = MAX_R_PX / (2 * Math.PI * TURNS);
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = paletteRef.current.guide;
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.setLineDash([2, 10]);
    ctx.beginPath();
    for (let th = 0; th <= 2 * Math.PI * TURNS; th += 0.04) {
      const r = b * th;
      const px = c + r * Math.cos(th);
      const py = c - r * Math.sin(th);
      if (th === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = paletteRef.current.guide;
    ctx.beginPath();
    ctx.arc(c, c, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = paletteRef.current.clay;
    ctx.lineWidth = 2.4;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    return ctx;
  }, []);

  useEffect(() => {
    prepare();
  }, [prepare]);

  // replay a recording at its recorded speed
  useEffect(() => {
    if (mode !== "replay" || !trace || trace.length < 2 || playToken === 0) return;
    const ctx = prepare();
    if (!ctx) return;
    let maxR = 0;
    for (const p of trace) maxR = Math.max(maxR, Math.hypot(p.x, p.y));
    const s = MAX_R_PX / (maxR || 1);
    const c = PAD_SIZE / 2;
    const px = (p: TracePoint): [number, number] => [c + p.x * s, c - p.y * s];
    onStart?.();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      ctx.beginPath();
      ctx.moveTo(...px(trace[0]));
      for (const p of trace) ctx.lineTo(...px(p));
      ctx.stroke();
      completeRef.current(trace);
      return;
    }

    let idx = 1;
    let raf = 0;
    const start = performance.now();
    const t0 = trace[0].t;
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000 + t0;
      ctx.beginPath();
      ctx.moveTo(...px(trace[idx - 1]));
      while (idx < trace.length && trace[idx].t <= elapsed) {
        ctx.lineTo(...px(trace[idx]));
        idx++;
      }
      ctx.stroke();
      if (idx >= trace.length) {
        completeRef.current(trace);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // onStart is intentionally excluded: a new callback identity must not restart a replay
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, trace, playToken, prepare]);

  const record = (ev: PointerEvent, ctx: CanvasRenderingContext2D | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cssX = ev.clientX - rect.left;
    const cssY = ev.clientY - rect.top;
    const point: TracePoint = {
      x: (cssX - rect.width / 2) * MM_PER_PX,
      y: (rect.height / 2 - cssY) * MM_PER_PX,
      t: (ev.timeStamp - t0Ref.current) / 1000,
    };
    const pts = pointsRef.current;
    const prev = pts[pts.length - 1];
    if (prev && point.t <= prev.t) return;
    pts.push(point);
    if (ctx && prev) {
      const k = PAD_SIZE / rect.width;
      ctx.beginPath();
      ctx.moveTo(rect.width / 2 * k + (prev.x / MM_PER_PX) * k, rect.height / 2 * k - (prev.y / MM_PER_PX) * k);
      ctx.lineTo(cssX * k, cssY * k);
      ctx.stroke();
    }
  };

  const handleDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== "capture") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    pointsRef.current = [];
    prepare();
    t0Ref.current = e.nativeEvent.timeStamp;
    record(e.nativeEvent, null);
    onStart?.();
  };

  const handleMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d") ?? null;
    const native = e.nativeEvent;
    const batch = typeof native.getCoalescedEvents === "function" ? native.getCoalescedEvents() : [];
    for (const ev of batch.length ? batch : [native]) record(ev, ctx);
  };

  const handleUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    completeRef.current(pointsRef.current);
  };

  return (
    <canvas
      ref={canvasRef}
      width={PAD_SIZE}
      height={PAD_SIZE}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      aria-label={mode === "capture" ? "Drawing pad with a dashed guide spiral. Trace it from the centre outward." : "Replay of a recorded spiral"}
      className="aspect-square w-full max-w-[360px] touch-none rounded-lg border border-border bg-background"
    />
  );
}
