import { ImageResponse } from "next/og";

export const alt = "Volutra: a 20-second spiral that shows when your dose wears off";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Archimedes spiral with a tremor wobble, as an SVG path for the card
function spiralPath(): string {
  const parts: string[] = [];
  const turns = 3;
  for (let i = 0; i <= 600; i++) {
    const th = (i / 600) * Math.PI * 2 * turns;
    const r = 6 + 12.5 * th + 5 * Math.sin(th * 9) * (i / 600);
    const x = 200 + r * Math.cos(th);
    const y = 200 - r * Math.sin(th);
    parts.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return parts.join(" ");
}

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", background: "#181210", padding: 72, gap: 56 }}>
        <div style={{ display: "flex", width: 400, height: 400, background: "#221a14", border: "4px solid #3d2f25", borderRadius: 6 }}>
          <svg width="400" height="400" viewBox="0 0 400 400">
            <path d={spiralPath()} fill="none" stroke="#cd7a52" strokeWidth="6" strokeLinecap="round" />
            <circle cx="200" cy="200" r="9" fill="#8a9a5b" />
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 24 }}>
          <div style={{ display: "flex", fontSize: 96, fontWeight: 700, color: "#f3ece4", borderBottom: "8px solid #cd7a52", paddingBottom: 8 }}>Volutra</div>
          <div style={{ display: "flex", fontSize: 38, lineHeight: 1.3, color: "#f3ece4" }}>
            Draw a spiral in 20 seconds. See the tremor frequency, its strength, and the hour your levodopa dose starts wearing off.
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#8a9a5b" }}>Runs in the browser. Nothing leaves the device.</div>
        </div>
      </div>
    ),
    size
  );
}
