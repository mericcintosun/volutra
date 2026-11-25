// Volutra's tremor pipeline. Everything here is plain math so it runs the same in the
// browser (live drawings) and on the server (seed records):
//   1. unwrap the drawn spiral into polar coordinates around the guide centre
//   2. fit the Archimedes line r = a + b * theta by least squares
//   3. take the radial residual, resample it to 100 Hz, remove the linear trend
//   4. Hann window, zero pad, radix-2 FFT
//   5. dominant frequency and RMS amplitude inside the 3 to 12 Hz tremor band

export interface TracePoint {
  /** millimetres, x to the right of the guide centre */
  x: number;
  /** millimetres, y upward from the guide centre */
  y: number;
  /** seconds since the pen touched down */
  t: number;
}

export interface SpiralGenerator {
  durationS: number;
  sampleRateHz: number;
  tremorHz: number;
  /** RMS of the tremor component in millimetres */
  tremorMm: number;
  turns?: number;
  maxRadiusMm?: number;
}

export interface SpectrumBin {
  hz: number;
  /** sinusoid amplitude estimate at this frequency, millimetres */
  mm: number;
}

export interface SpiralAnalysis {
  peakHz: number;
  /** RMS of the radial deviation inside the tremor band, millimetres */
  amplitudeMm: number;
  /** share of 1 to 20 Hz power that sits inside 3 to 12 Hz */
  bandRatio: number;
  residualRmsMm: number;
  sampleRateHz: number;
  durationS: number;
  points: number;
  fit: { a: number; b: number };
  spectrum: SpectrumBin[];
}

export const TREMOR_BAND = { lowHz: 3, highHz: 12 } as const;
/** Outer radius of the guide spiral in millimetres; UCI recordings are scaled to it. */
export const GUIDE_MAX_RADIUS_MM = 45;
const RESAMPLE_HZ = 100;
const SPECTRUM_MAX_HZ = 15;

/* ---------- deterministic randomness for seed traces ---------- */

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(start: number): () => number {
  let a = start;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Builds a timestamped spiral the way a hand would draw it: uneven pen speed, slow
 * drift off the guide, a tremor sinusoid with a breathing envelope, sensor noise.
 * Used for the seeded demo diary until real UCI recordings are converted.
 */
export function synthesizeTrace(g: SpiralGenerator, seed: string): TracePoint[] {
  const rand = mulberry32(hashSeed(seed));
  const turns = g.turns ?? 3;
  const maxR = g.maxRadiusMm ?? GUIDE_MAX_RADIUS_MM;
  const a = 2;
  const b = (maxR - a) / (2 * Math.PI * turns);
  const n = Math.round(g.durationS * g.sampleRateHz);
  const pDrift = rand() * Math.PI * 2;
  const pTremor = rand() * Math.PI * 2;
  const pEnv = rand() * Math.PI * 2;
  const pSpeed = rand() * Math.PI * 2;
  // envelope 0.85 + 0.15 sin has RMS 0.8566; divide it out so the RMS equals tremorMm
  const tremorPeak = (g.tremorMm * Math.SQRT2) / 0.8566;
  const points: TracePoint[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / g.sampleRateHz;
    const u = t / g.durationS;
    const warped = u + 0.025 * Math.sin(2 * Math.PI * 2 * u + pSpeed);
    const theta = 2 * Math.PI * turns * warped;
    const drift = 0.35 * Math.sin(2 * Math.PI * 0.35 * t + pDrift);
    const env = 0.85 + 0.15 * Math.sin(2 * Math.PI * 0.2 * t + pEnv);
    const tremor = tremorPeak * env * Math.sin(2 * Math.PI * g.tremorHz * t + pTremor);
    const noise = (rand() - 0.5) * 0.12;
    const r = a + b * theta + drift + tremor + noise;
    points.push({ x: r * Math.cos(theta), y: r * Math.sin(theta), t });
  }
  return points;
}

/* ---------- polar unwrap and Archimedes fit ---------- */

export interface Unwrapped {
  t: number[];
  theta: number[];
  angle: number[];
  r: number[];
  residual: number[];
  a: number;
  b: number;
}

export function unwrapSpiral(
  points: TracePoint[],
  center: { x: number; y: number } = { x: 0, y: 0 },
  minRadiusMm = 3
): Unwrapped | null {
  const t: number[] = [];
  const theta: number[] = [];
  const angle: number[] = [];
  const r: number[] = [];
  let prev: number | null = null;
  let acc = 0;
  for (const p of points) {
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    const rr = Math.hypot(dx, dy);
    if (rr < minRadiusMm) continue;
    const ang = Math.atan2(dy, dx);
    if (prev !== null) {
      let d = ang - prev;
      if (d > Math.PI) d -= 2 * Math.PI;
      else if (d < -Math.PI) d += 2 * Math.PI;
      acc += d;
    }
    prev = ang;
    t.push(p.t);
    theta.push(acc);
    angle.push(ang);
    r.push(rr);
  }
  if (t.length < 32) return null;

  // clockwise drawings unwrap to negative angles; flip so theta grows outward
  if (theta[theta.length - 1] < 0) for (let i = 0; i < theta.length; i++) theta[i] = -theta[i];

  const n = theta.length;
  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i++) {
    mx += theta[i];
    my += r[i];
  }
  mx /= n;
  my /= n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (theta[i] - mx) ** 2;
    sxy += (theta[i] - mx) * (r[i] - my);
  }
  if (sxx === 0) return null;
  const b = sxy / sxx;
  const a = my - b * mx;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const residual = r.map((rr, i) => rr - (a + b * theta[i]));
  return { t, theta, angle, r, residual, a, b };
}

/* ---------- resampling and FFT ---------- */

function resample(t: number[], v: number[], hz: number): Float64Array {
  const t0 = t[0];
  const t1 = t[t.length - 1];
  const n = Math.floor((t1 - t0) * hz) + 1;
  const out = new Float64Array(n);
  let j = 0;
  for (let i = 0; i < n; i++) {
    const tt = t0 + i / hz;
    while (j < t.length - 2 && t[j + 1] < tt) j++;
    const span = t[j + 1] - t[j];
    const f = span > 0 ? Math.min(1, Math.max(0, (tt - t[j]) / span)) : 0;
    out[i] = v[j] + (v[j + 1] - v[j]) * f;
  }
  return out;
}

function detrend(x: Float64Array): Float64Array {
  const n = x.length;
  const mx = (n - 1) / 2;
  let my = 0;
  for (let i = 0; i < n; i++) my += x[i];
  my /= n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (i - mx) ** 2;
    sxy += (i - mx) * (x[i] - my);
  }
  const slope = sxx > 0 ? sxy / sxx : 0;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = x[i] - (my + slope * (i - mx));
  return out;
}

/** In-place iterative radix-2 Cooley-Tukey FFT. Length must be a power of two. */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < half; k++) {
        const p = i + k;
        const q = p + half;
        const xr = re[q] * cr - im[q] * ci;
        const xi = re[q] * ci + im[q] * cr;
        re[q] = re[p] - xr;
        im[q] = im[p] - xi;
        re[p] += xr;
        im[p] += xi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

/* ---------- the full analysis ---------- */

export function analyzeTrace(
  points: TracePoint[],
  center: { x: number; y: number } = { x: 0, y: 0 }
): SpiralAnalysis | null {
  if (points.length < 64) return null;
  const u = unwrapSpiral(points, center);
  if (!u) return null;
  const durationS = u.t[u.t.length - 1] - u.t[0];
  if (durationS < 2) return null;

  const sig = detrend(resample(u.t, u.residual, RESAMPLE_HZ));
  const L = sig.length;
  let N = 1;
  while (N < L) N <<= 1;
  N = Math.max(N * 2, 1024);

  const re = new Float64Array(N);
  const im = new Float64Array(N);
  let wSum = 0;
  let w2Sum = 0;
  for (let i = 0; i < L; i++) {
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (L - 1)));
    re[i] = sig[i] * w;
    wSum += w;
    w2Sum += w * w;
  }
  fft(re, im);

  const df = RESAMPLE_HZ / N;
  const half = N / 2;
  const power = new Float64Array(half + 1);
  for (let k = 0; k <= half; k++) power[k] = re[k] * re[k] + im[k] * im[k];

  let bandPower = 0;
  let totalPower = 0;
  let peakK = -1;
  for (let k = 1; k <= half; k++) {
    const hz = k * df;
    if (hz >= 1 && hz <= 20) totalPower += power[k];
    if (hz >= TREMOR_BAND.lowHz && hz <= TREMOR_BAND.highHz) {
      bandPower += power[k];
      if (peakK < 0 || power[k] > power[peakK]) peakK = k;
    }
  }

  // parabolic interpolation on magnitude around the peak bin
  let peakHz = peakK * df;
  if (peakK > 0 && peakK < half) {
    const al = Math.sqrt(power[peakK - 1]);
    const be = Math.sqrt(power[peakK]);
    const ga = Math.sqrt(power[peakK + 1]);
    const denom = al - 2 * be + ga;
    if (denom !== 0) peakHz = (peakK + (0.5 * (al - ga)) / denom) * df;
  }

  // Parseval: band mean square = (2 / N) * sum |X_k|^2 / sum w^2
  const amplitudeMm = Math.sqrt((2 * bandPower) / (N * w2Sum));

  const spectrum: SpectrumBin[] = [];
  const maxK = Math.floor(SPECTRUM_MAX_HZ / df);
  const step = Math.max(1, Math.ceil(maxK / 150));
  for (let k = 1; k <= maxK; k += step) {
    let best = 0;
    for (let j = k; j < Math.min(k + step, maxK + 1); j++) best = Math.max(best, power[j]);
    spectrum.push({ hz: +(k * df).toFixed(3), mm: +((2 * Math.sqrt(best)) / wSum).toFixed(4) });
  }

  let rss = 0;
  for (const e of u.residual) rss += e * e;
  const totalSpan = points[points.length - 1].t - points[0].t;

  return {
    peakHz: +peakHz.toFixed(2),
    amplitudeMm: +amplitudeMm.toFixed(3),
    bandRatio: +(totalPower > 0 ? bandPower / totalPower : 0).toFixed(3),
    residualRmsMm: +Math.sqrt(rss / u.residual.length).toFixed(3),
    sampleRateHz: +(totalSpan > 0 ? (points.length - 1) / totalSpan : 0).toFixed(1),
    durationS: +durationS.toFixed(1),
    points: points.length,
    fit: { a: +u.a.toFixed(2), b: +u.b.toFixed(3) },
    spectrum,
  };
}

/* ---------- geometry for the 3D coil ---------- */

export type Vec3 = [number, number, number];

/**
 * The drawn spiral as a raised coil: residuals exaggerated so the tremor is visible,
 * the fitted Archimedes line alongside it, and a 0..1 heat value per point.
 */
export function coilPath(points: TracePoint[], maxSegments = 420, exaggeration = 3) {
  const u = unwrapSpiral(points);
  if (!u) return null;
  const step = Math.max(1, Math.ceil(u.r.length / maxSegments));
  let maxR = 0;
  for (const rr of u.r) maxR = Math.max(maxR, rr);
  const scale = 3.2 / maxR;
  const drawn: Vec3[] = [];
  const ideal: Vec3[] = [];
  const heat: number[] = [];
  for (let i = 0; i < u.r.length; i += step) {
    const fitR = u.a + u.b * u.theta[i];
    const res = u.residual[i];
    const rr = fitR + res * exaggeration;
    const c = Math.cos(u.angle[i]);
    const s = Math.sin(u.angle[i]);
    drawn.push([rr * c * scale, 0.06 + Math.min(0.4, Math.abs(res) * 0.2), -rr * s * scale]);
    ideal.push([fitR * c * scale, 0.01, -fitR * s * scale]);
    heat.push(Math.min(1, Math.abs(res) / 1.6));
  }
  return { drawn, ideal, heat };
}
