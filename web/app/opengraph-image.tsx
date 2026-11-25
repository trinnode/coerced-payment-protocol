import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Phylax — a safer signal when consent is taken away";

// Same geometry as public/brand/phylax-mark.svg. Kept here because Satori needs
// an inline data URI rather than a file path.
const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
<g stroke="#7fe3c0" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round">
<path d="M24 3C30 6 36.5 8 42 10V19"/>
<path d="M42 25C42 34 34 41 24 45C14 41 6 34 6 24V10C11.5 8 18 6 24 3"/>
<path d="M18.5 33V16.5h6.8c4.1 0 6.4 2.3 6.4 5.4 0 3.1-2.3 5.5-6.4 5.5"/>
</g>
<path d="M31.5 22H46" stroke="#efb45c" stroke-width="4.2" stroke-linecap="round"/>
</svg>`;

const markUri = `data:image/svg+xml;base64,${Buffer.from(mark).toString("base64")}`;

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#050807",
          color: "#e7eeea",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={markUri} width={88} height={88} alt="" />
          <div style={{ fontSize: 44, letterSpacing: -1 }}>Phylax</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 68, lineHeight: 1.08, letterSpacing: -2 }}>
            A safer signal when consent is taken away.
          </div>
          <div style={{ fontSize: 26, color: "#94a49d" }}>
            Open design record · protocol v0.1 · no production deployment
          </div>
        </div>
      </div>
    ),
    size,
  );
}
