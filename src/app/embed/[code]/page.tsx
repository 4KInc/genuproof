"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function EmbedBadge() {
  const params = useParams();
  const code = params.code as string;
  const [authentic, setAuthentic] = useState<boolean | null>(null);
  const [productName, setProductName] = useState("");
  const [brandName, setBrandName] = useState("");

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch(`/api/products/verify?code=${code}`);
        const data = await res.json();
        setAuthentic(data.authentic);
        setProductName(data.product?.name || "");
        setBrandName(data.product?.brandName || "");
      } catch {
        setAuthentic(false);
      }
    }
    check();
  }, [code]);

  if (authentic === null) {
    return (
      <div style={{ fontFamily: "system-ui", padding: 12, fontSize: 12, color: "#6b6960" }}>
        Verifying...
      </div>
    );
  }

  const bgColor = authentic ? "#f0faf5" : "#fef2f2";
  const borderColor = authentic ? "#0d503c" : "#9b2c2c";
  const textColor = authentic ? "#0d503c" : "#9b2c2c";

  return (
    <div
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        border: `1px solid ${borderColor}30`,
        borderTop: `3px solid ${borderColor}`,
        background: bgColor,
        padding: "14px 16px",
        maxWidth: 320,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: `2px solid ${borderColor}40`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {authentic ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={borderColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={borderColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 18 18 6M6 6l12 12" />
          </svg>
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: textColor, letterSpacing: "0.05em", textTransform: "uppercase" as const }}>
          {authentic ? "Verified Authentic" : "Not Verified"}
        </div>
        <div style={{ fontSize: 11, color: "#6b6960", marginTop: 2, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>
          {brandName} — {productName}
        </div>
        <a
          href={`https://authentik-platform.vercel.app/verify/${code}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 9, color: "#6b6960", textDecoration: "none", opacity: 0.6, marginTop: 2, display: "inline-block" }}
        >
          Powered by Authentik
        </a>
      </div>
    </div>
  );
}
