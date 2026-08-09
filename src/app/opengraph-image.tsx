import { ImageResponse } from "next/og";

export const alt = "GondrongShop — Demo Marketplace";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 72,
            fontWeight: 700,
          }}
        >
          <span>Gondrong</span>
          <span style={{ color: "#a855f7" }}>Shop</span>
        </div>
        <div style={{ marginTop: 24, fontSize: 32, color: "#a1a1aa" }}>
          Demo marketplace — browse, check out, track.
        </div>
      </div>
    ),
    { ...size }
  );
}