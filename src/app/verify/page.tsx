"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";

export default function VerifyLanding() {
  const [code, setCode] = useState("");
  const router = useRouter();

  const handleVerify = () => {
    if (code.trim()) router.push(`/verify/${code.trim()}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-sm w-full">
          <p className="text-[13px] text-muted-foreground tracking-wide uppercase mb-4 animate-reveal">
            Product Verification
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-[2.5rem] leading-[1.05] tracking-tight mb-4 animate-reveal delay-1">
            Verify <em className="text-accent">authenticity.</em>
          </h1>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-8 animate-reveal delay-2">
            Enter the verification code from the product certificate, packaging, or QR code.
          </p>
          <div className="flex border border-border bg-card animate-reveal delay-3">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              placeholder="Verification code"
              autoFocus
              className="flex-1 px-4 py-3 text-[13px] font-mono bg-transparent placeholder:text-muted-foreground/40 focus:outline-none"
            />
            <button
              onClick={handleVerify}
              disabled={!code.trim()}
              className="px-5 py-3 bg-primary text-primary-foreground text-[13px] font-medium tracking-wide hover:bg-primary/90 transition-colors disabled:opacity-40"
            >
              Verify
            </button>
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground/60 animate-reveal delay-4">
            Found on the product packaging, certificate card, or via QR scan.
          </p>
        </div>
      </div>
    </div>
  );
}
