"use client";

export function VerificationBadge({
  authentic,
  brandName,
  productName,
  hash,
}: {
  authentic: boolean;
  brandName: string;
  productName: string;
  hash: string;
}) {
  return (
    <div className="relative border border-border bg-card guilloche overflow-hidden rounded-lg">
      {/* Top ornamental border */}
      <div className={`h-1 ${authentic ? "bg-primary" : "bg-destructive"}`} />

      <div className="p-8 md:p-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
              Certificate of Authenticity
            </div>
            <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 mt-0.5">
              Cryptographically Verified
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${authentic ? "bg-primary" : "bg-destructive"}`} />
            <span className={`text-[11px] font-medium tracking-wide uppercase ${authentic ? "text-primary" : "text-destructive"}`}>
              {authentic ? "Authentic" : "Failed"}
            </span>
          </div>
        </div>

        <div className="h-px bg-border mb-8" />

        {/* Main content */}
        <div className="grid md:grid-cols-[1fr,auto] gap-8 items-start">
          <div className="space-y-6">
            <div>
              <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-1">Brand</div>
              <div className="font-[family-name:var(--font-display)] text-2xl">{brandName}</div>
            </div>
            <div>
              <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-1">Product</div>
              <div className="text-[15px]">{productName}</div>
            </div>
            <div>
              <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">
                SHA-256 Fingerprint
              </div>
              <div className="font-mono text-[10px] text-muted-foreground leading-relaxed break-all bg-secondary/50 border border-border rounded-md px-3 py-2">
                {hash}
              </div>
            </div>
          </div>

          {/* Stamp */}
          <div
            className={`w-24 h-24 border-2 rounded-full flex items-center justify-center rotate-[-5deg] shrink-0 hidden md:flex animate-stamp ${
              authentic
                ? "border-primary/30"
                : "border-destructive/30"
            }`}
          >
            <div className="text-center">
              <div className={`text-[8px] tracking-[0.15em] uppercase font-bold ${
                authentic ? "text-primary/40" : "text-destructive/40"
              }`}>
                {authentic ? "Verified" : "Warning"}
              </div>
              <div className={`text-[6px] tracking-[0.1em] uppercase ${
                authentic ? "text-primary/25" : "text-destructive/25"
              }`}>
                {authentic ? "Authentic" : "Unverified"}
              </div>
            </div>
          </div>
        </div>

        <div className="h-px bg-border my-6" />

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="text-[10px] text-muted-foreground/50">
            Verified {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
            <div className="w-3 h-3 border border-muted-foreground/20 rounded-sm flex items-center justify-center">
              <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            GenuProof
          </div>
        </div>
      </div>
    </div>
  );
}
