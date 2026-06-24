"use client";

import Link from "next/link";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  const [verifyCode, setVerifyCode] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-background/90 backdrop-blur-sm">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10">
          <div className="flex items-center justify-between h-14 border-b border-border">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-6 h-6 border-2 border-primary rounded-sm flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <span className="text-sm font-medium tracking-wide uppercase">GenuProof</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/explore" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
                Explore
              </Link>
              <Link href="/verify" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
                Verify
              </Link>
              <Link href="/dashboard" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
                Dashboard
              </Link>
              <Link href="/docs" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
                API
              </Link>
              <Link href="/pricing" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
                Pricing
              </Link>
              <Link href="/integrations" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
                Integrations
              </Link>
              <Link href="/mcp" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
                MCP
              </Link>
              <ThemeToggle />
              <Link
                href="/dashboard"
                className="text-[13px] px-4 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors hidden sm:inline-flex"
              >
                Get Started
              </Link>
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileNav(!mobileNav)}
                className="sm:hidden p-1 cursor-pointer"
              >
                <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  {mobileNav ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
                  )}
                </svg>
              </button>
            </div>
          </div>
          {/* Mobile nav dropdown */}
          {mobileNav && (
            <div className="sm:hidden border-t border-border py-3 space-y-1">
              {[
                { href: "/explore", label: "Explore" },
                { href: "/verify", label: "Verify" },
                { href: "/dashboard", label: "Dashboard" },
                { href: "/docs", label: "API" },
                { href: "/mcp", label: "MCP" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block px-2 py-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setMobileNav(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/dashboard"
                className="block px-2 py-2 text-[13px] text-primary font-medium"
                onClick={() => setMobileNav(false)}
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-16 px-6 md:px-10">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid md:grid-cols-[1fr,380px] gap-12 md:gap-20 items-start">
            <div>
              <p className="text-[13px] text-muted-foreground tracking-wide uppercase mb-6 animate-reveal">
                Anti-counterfeiting platform
              </p>
              <h1
                className="font-[family-name:var(--font-display)] text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.05] tracking-[-0.02em] animate-reveal delay-1"
              >
                Every authentic product
                <br />
                deserves <em className="text-accent">proof.</em>
              </h1>
              <p className="mt-8 text-[15px] text-muted-foreground leading-relaxed max-w-[480px] animate-reveal delay-2">
                Cryptographic certificates that travel with your product from factory to consumer.
                One scan to verify. One tampered byte to detect. Built on DynamoDB for verification
                at any scale.
              </p>

              {/* Actions */}
              <div className="mt-10 flex flex-col sm:flex-row items-start gap-3 animate-reveal delay-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-[13px] font-medium tracking-wide hover:bg-primary/90 transition-colors"
                >
                  Register your brand
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
                <div className="flex items-center border border-border bg-card">
                  <input
                    type="text"
                    placeholder="Verification code"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && verifyCode.trim()) {
                        window.location.href = `/verify/${verifyCode.trim()}`;
                      }
                    }}
                    className="w-44 px-3 py-2.5 text-[13px] bg-transparent placeholder:text-muted-foreground/60 focus:outline-none font-mono"
                  />
                  <button
                    onClick={() => verifyCode.trim() && (window.location.href = `/verify/${verifyCode.trim()}`)}
                    className="px-3 py-2.5 border-l border-border text-[13px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    Verify
                  </button>
                </div>
              </div>
            </div>

            {/* Certificate preview card */}
            <div className="animate-reveal delay-4 hidden md:block">
              <div className="relative">
                <div className="border border-border bg-card p-6 guilloche">
                  {/* Certificate header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                      Certificate of Authenticity
                    </div>
                    <div className="w-8 h-8 border border-primary/30 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    </div>
                  </div>

                  <div className="h-px bg-border mb-5" />

                  <div className="space-y-4">
                    <div>
                      <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-1">Brand</div>
                      <div className="font-[family-name:var(--font-display)] text-lg">Luxe Watches</div>
                    </div>
                    <div>
                      <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-1">Product</div>
                      <div className="text-[13px]">Royal Oak Chronograph 42mm</div>
                    </div>
                    <div>
                      <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-1">Status</div>
                      <div className="inline-flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="text-[12px] text-primary font-medium">Verified Authentic</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-border my-5" />

                  <div>
                    <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-1.5">SHA-256 Fingerprint</div>
                    <div className="font-mono text-[10px] text-muted-foreground leading-relaxed break-all">
                      139fd93e71a9fb2e3ef01af8...d17b97
                    </div>
                  </div>

                  {/* Stamp */}
                  <div className="absolute -bottom-3 -right-3 w-20 h-20 border-2 border-primary/20 rounded-full flex items-center justify-center rotate-[-8deg]">
                    <div className="text-[7px] tracking-[0.2em] uppercase text-primary/30 font-bold text-center leading-tight">
                      Verified
                      <br />
                      Authentic
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hash ticker */}
      <div className="border-y border-border py-2.5 overflow-hidden">
        <div className="hash-ticker">
          <div className="hash-ticker-inner font-mono text-[11px] text-muted-foreground/40 tracking-wider">
            139fd93e71a9fb2e3ef01af8aa60fc077f9dcdd5c4d71963939fd45406d17b97 &middot; cac3be9bdc7c79839fa7001330109fc6fcc72ed1a1dbbe676a0e27a3f50855b6 &middot; ad3f0d6f0151514275f99b0c2bd6a46daeefd328a7db8cee5b3f1b67a23fc566 &middot; 98aca598f27b8d82999de4e1d95c429d2b4c54d821e9a979a2d277d1c496e0c2 &middot;&nbsp;
            139fd93e71a9fb2e3ef01af8aa60fc077f9dcdd5c4d71963939fd45406d17b97 &middot; cac3be9bdc7c79839fa7001330109fc6fcc72ed1a1dbbe676a0e27a3f50855b6 &middot; ad3f0d6f0151514275f99b0c2bd6a46daeefd328a7db8cee5b3f1b67a23fc566 &middot; 98aca598f27b8d82999de4e1d95c429d2b4c54d821e9a979a2d277d1c496e0c2 &middot;&nbsp;
          </div>
        </div>
      </div>

      {/* Bento Stats + Features */}
      <section className="py-20 px-6 md:px-10">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid md:grid-cols-4 gap-px bg-border">
            {[
              { value: "$2T+", label: "Global counterfeit market", sub: "annually" },
              { value: "<10ms", label: "Verification latency", sub: "DynamoDB" },
              { value: "SHA-256", label: "Cryptographic standard", sub: "HMAC signed" },
              { value: "100%", label: "Tamper detection", sub: "hash chain" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`bg-background p-8 animate-reveal delay-${i + 1}`}
              >
                <div className="font-[family-name:var(--font-display)] text-3xl md:text-4xl tracking-tight">
                  {stat.value}
                </div>
                <div className="mt-2 text-[13px] text-foreground">{stat.label}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features — editorial layout */}
      <section className="pb-20 px-6 md:px-10">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid md:grid-cols-2 gap-16">
            <div>
              <p className="text-[13px] text-muted-foreground tracking-wide uppercase mb-4">
                How it protects
              </p>
              <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-[2.5rem] leading-[1.1] tracking-tight">
                Three layers of defense,
                <br />
                <em className="text-accent">zero complexity.</em>
              </h2>
            </div>
            <div className="space-y-0 border-t border-border">
              {[
                {
                  num: "01",
                  title: "Cryptographic Certificates",
                  desc: "Every product gets a unique SHA-256 hash and HMAC-SHA256 signature. Tamper with one byte and verification fails. No private keys for consumers to manage.",
                },
                {
                  num: "02",
                  title: "Hash-Chained Provenance",
                  desc: "Every supply chain event is cryptographically linked to the previous one. An unbroken chain from factory to consumer. Break one link and the entire trail flags.",
                },
                {
                  num: "03",
                  title: "Threat Intelligence",
                  desc: "Real-time anomaly detection catches geographic fraud, burst scanning patterns, and counterfeit hotspots. AI-powered alerts before counterfeits spread.",
                },
              ].map((f) => (
                <div key={f.num} className="py-6 border-b border-border group">
                  <div className="flex items-start gap-6">
                    <span className="font-mono text-[12px] text-muted-foreground pt-0.5 shrink-0">
                      {f.num}
                    </span>
                    <div>
                      <h3 className="text-[15px] font-medium mb-1.5 group-hover:text-primary transition-colors">
                        {f.title}
                      </h3>
                      <p className="text-[13px] text-muted-foreground leading-relaxed">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works — horizontal steps */}
      <section className="py-20 px-6 md:px-10 border-t border-border bg-secondary/30">
        <div className="max-w-[1200px] mx-auto">
          <p className="text-[13px] text-muted-foreground tracking-wide uppercase mb-4">Process</p>
          <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-[2.5rem] leading-[1.1] tracking-tight mb-14">
            From registration to<br />verification in <em className="text-accent">seconds.</em>
          </h2>

          <div className="grid md:grid-cols-3 gap-px bg-border">
            {[
              {
                step: "Register",
                desc: "Upload your product catalog. Each item receives a unique cryptographic certificate and QR code. Batch registration via API.",
                detail: "POST /api/products/register",
              },
              {
                step: "Verify",
                desc: "Consumers scan the QR or enter the code. Instant verification with full provenance chain, brand details, and trust certificate.",
                detail: "GET /api/products/verify",
              },
              {
                step: "Monitor",
                desc: "Real-time anomaly detection. Geographic fraud heatmaps. Burst scan alerts. Counterfeit pattern intelligence delivered to your dashboard.",
                detail: "GET /api/threats",
              },
            ].map((item, i) => (
              <div key={item.step} className="bg-background p-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-7 h-7 border border-border flex items-center justify-center font-mono text-[11px] text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="font-[family-name:var(--font-display)] text-xl">{item.step}</span>
                </div>
                <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
                  {item.desc}
                </p>
                <code className="font-mono text-[10px] text-accent/70 bg-accent/5 px-2 py-1 border border-accent/10">
                  {item.detail}
                </code>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 md:px-10 border-t border-border">
        <div className="max-w-[1200px] mx-auto">
          <div className="max-w-xl">
            <h2 className="font-[family-name:var(--font-display)] text-3xl md:text-[2.5rem] leading-[1.1] tracking-tight mb-4">
              Stop losing revenue<br />to counterfeits.
            </h2>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-8">
              Free tier includes 100 product verifications per month.
              Enterprise API for high-volume brands. No credit card required.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-[13px] font-medium tracking-wide hover:bg-primary/90 transition-colors"
            >
              Start protecting your brand
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 md:px-10 border-t border-border">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <div className="w-4 h-4 border border-primary/40 rounded-sm flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            GenuProof
          </div>
          <div className="flex items-center gap-4">
            <Link href="/status" className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors">Status</Link>
            <Link href="/compare" className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors">Compare</Link>
            <Link href="/analytics" className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors">Analytics</Link>
            <Link href="/docs" className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors">API</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
