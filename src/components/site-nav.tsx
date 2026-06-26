"use client";

import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_LINKS = [
  { href: "/explore", label: "Explore" },
  { href: "/verify", label: "Verify" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/docs", label: "API" },
  { href: "/pricing", label: "Pricing" },
  { href: "/integrations", label: "Integrations" },
  { href: "/mcp", label: "MCP" },
];

export function SiteNav() {
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <nav className="border-b border-border bg-background/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-6 h-6 border-2 border-primary rounded-md flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-wide uppercase">GenuProof</span>
          </Link>
          <div className="flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
              >
                {link.label}
              </Link>
            ))}
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="text-[13px] px-4 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-all hidden sm:inline-flex active:scale-[0.98]"
            >
              Get Started
            </Link>
            <button
              onClick={() => setMobileNav(!mobileNav)}
              className="sm:hidden p-1.5 rounded-md hover:bg-secondary transition-colors"
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
        {mobileNav && (
          <div className="sm:hidden border-t border-border py-3 space-y-0.5 animate-reveal">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-3 py-2.5 text-[13px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-md transition-colors"
                onClick={() => setMobileNav(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/dashboard"
              className="block px-3 py-2.5 text-[13px] text-primary font-medium hover:bg-primary/5 rounded-md transition-colors"
              onClick={() => setMobileNav(false)}
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
