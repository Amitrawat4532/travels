import { ImageResponse } from "next/og";

export const alt = "Pahadi Seat — Kal ghar jaana hai? Book shared taxi seats in Uttarakhand";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#faf8f3", padding: 72, position: "relative" }}>
        <svg width="1200" height="260" viewBox="0 0 1440 320" style={{ position: "absolute", left: 0, bottom: 0 }}>
          <path d="M0 230 120 150l80 50 140-120 110 90 90-60 170 130 130-110 120 70 150-140 140 120 90-50 100 70V320H0Z" fill="#d9e9de" />
          <path d="m0 290 200-40 160 30 220-50 200 50 180-30 240 40 240-30V320H0Z" fill="#82b493" />
        </svg>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 40, fontWeight: 800, color: "#1b4730" }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "#1b4730", display: "flex" }} />
          Pahadi Seat
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, fontWeight: 800, color: "#0f291d", letterSpacing: -3 }}>Kal ghar jaana hai?</div>
          <div style={{ fontSize: 38, color: "#3c4549", marginTop: 12 }}>Verified local drivers se seat book karo · Dehradun ↔ Rudraprayag</div>
        </div>
      </div>
    ),
    size,
  );
}
