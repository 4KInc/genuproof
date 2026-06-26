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
        <div className="max-w-md w-full">
          <p className="text-[13px] text-muted-foreground tracking-wide uppercase mb-4 animate-reveal">
            Product Verification
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-[2.5rem] leading-[1.05] tracking-tight mb-4 animate-reveal delay-1">
            Verify <em className="text-accent">authenticity.</em>
          </h1>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-8 animate-reveal delay-2">
            Enter the verification code from the product certificate, packaging, or QR code.
          </p>
          <div className="flex border border-border bg-card rounded-lg overflow-hidden animate-reveal delay-3 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
            <div className="flex items-center pl-4 text-muted-foreground/40">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              placeholder="Enter verification code"
              autoFocus
              className="flex-1 px-3 py-3.5 text-[13px] font-mono bg-transparent placeholder:text-muted-foreground/40 focus:outline-none"
            />
            <button
              onClick={handleVerify}
              disabled={!code.trim()}
              className="px-6 py-3.5 bg-primary text-primary-foreground text-[13px] font-medium tracking-wide hover:bg-primary/90 transition-colors disabled:opacity-40"
            >
              Verify
            </button>
          </div>
          <div className="mt-5 flex items-center gap-4 animate-reveal delay-4">
            <p className="text-[11px] text-muted-foreground/60">
              Found on the product packaging, certificate card, or via QR scan.
            </p>
            <Link href="/explore" className="text-[11px] text-primary hover:text-primary/80 transition-colors whitespace-nowrap font-medium">
              Browse products
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
