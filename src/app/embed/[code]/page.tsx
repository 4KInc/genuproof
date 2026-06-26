"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function EmbedBadge() {
  const params = useParams();
  const code = params.code as string;
  const [authentic, setAuthentic] = useState<boolean | null>(null);
  const [productName, setProductName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch(`/api/products/verify?code=${code}&metadata=true`);
        const data = await res.json();
        setAuthentic(data.authentic);
        setProductName(data.product?.name || "");
        setBrandName(data.product?.brandName || "");
      } catch {
        setAuthentic(false);
        setError(true);
      }
    }
    check();
  }, [code]);

  if (authentic === null) {
    return (
      <div style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "14px 16px",
        fontSize: 12,
        color: "var(--genuproof-muted, #6b6960)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        maxWidth: 320,
        border: "1px solid var(--genuproof-border, #d4cfc4)",
        borderRadius: 10,
        background: "var(--genuproof-bg, #faf8f4)",
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          border: "2px solid var(--genuproof-border, #d4cfc4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
          animation: "pulse 1.5s ease-in-out infinite",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4m0 12v4m-7.07-3.93 2.83-2.83m8.48-8.48 2.83-2.83M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83" />
          </svg>
        </div>
        <span>Verifying...</span>
        <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      </div>
    );
  }

  const isGreen = authentic && !error;
  const primaryColor = isGreen ? "var(--genuproof-primary, #0d503c)" : "var(--genuproof-destructive, #9b2c2c)";
  const bgColor = isGreen ? "var(--genuproof-primary-bg, #f0faf5)" : "var(--genuproof-destructive-bg, #fef2f2)";

  return (
    <a
      href={`https://genuproof.com/verify/${code}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        border: `1px solid color-mix(in srgb, ${primaryColor} 20%, transparent)`,
        borderTop: `3px solid ${primaryColor}`,
        borderRadius: 10,
        background: bgColor,
        padding: "14px 16px",
        maxWidth: 320,
        display: "flex",
        alignItems: "center",
        gap: 12,
        textDecoration: "none",
        color: "inherit",
        cursor: "pointer",
        transition: "box-shadow 0.2s ease, border-color 0.2s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 2px 8px color-mix(in srgb, ${primaryColor} 15%, transparent)`; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          border: `2px solid color-mix(in srgb, ${primaryColor} 30%, transparent)`,
          background: `color-mix(in srgb, ${primaryColor} 8%, transparent)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {isGreen ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 18 18 6M6 6l12 12" />
          </svg>
        )}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: primaryColor, letterSpacing: "0.04em", textTransform: "uppercase" as const }}>
          {isGreen ? "Verified Authentic" : error ? "Verification Error" : "Not Verified"}
        </div>
        {(brandName || productName) && (
          <div style={{ fontSize: 11, color: "#6b6960", marginTop: 3, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }} title={`${brandName} — ${productName}`}>
            {brandName}{brandName && productName ? " — " : ""}{productName}
          </div>
        )}
        <div style={{ fontSize: 9, color: "#6b6960", opacity: 0.5, marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          Powered by GenuProof
        </div>
      </div>
    </a>
  );
}
