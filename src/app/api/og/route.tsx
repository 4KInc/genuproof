import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const brand = req.nextUrl.searchParams.get("brand") || "Authentik";
  const product = req.nextUrl.searchParams.get("product") || "Product Verification";
  const status = req.nextUrl.searchParams.get("status") || "authentic";
  const hash = req.nextUrl.searchParams.get("hash") || "";

  const isAuthentic = status === "authentic";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#faf8f4",
          padding: 60,
          fontFamily: "system-ui",
        }}
      >
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 28,
                height: 28,
                border: "2.5px solid #0d503c",
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                color: "#0d503c",
                fontWeight: 700,
              }}
            >
              ✓
            </div>
            <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: 3, color: "#1a1a18", textTransform: "uppercase" as const }}>
              AUTHENTIK
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              fontWeight: 600,
              color: isAuthentic ? "#0d503c" : "#9b2c2c",
              textTransform: "uppercase" as const,
              letterSpacing: 2,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: isAuthentic ? "#0d503c" : "#9b2c2c",
              }}
            />
            {isAuthentic ? "VERIFIED" : "UNVERIFIED"}
          </div>
        </div>

        {/* Center content */}
        <div>
          <div style={{ fontSize: 14, color: "#6b6960", letterSpacing: 2, textTransform: "uppercase" as const, marginBottom: 8 }}>
            Certificate of Authenticity
          </div>
          <div style={{ fontSize: 48, fontWeight: 400, color: "#1a1a18", lineHeight: 1.1, fontStyle: "italic" }}>
            {product}
          </div>
          <div style={{ fontSize: 20, color: "#6b6960", marginTop: 12 }}>
            by {brand}
          </div>
        </div>

        {/* Hash footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: 11, fontFamily: "monospace", color: "#6b696040", letterSpacing: 1 }}>
            {hash ? hash.slice(0, 32) + "..." : "SHA-256 VERIFIED"}
          </div>
          <div style={{ fontSize: 11, color: "#6b696060" }}>
            authentik-platform.vercel.app
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
