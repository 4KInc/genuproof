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
    <div
      className={`relative overflow-hidden rounded-2xl border-2 p-8 ${
        authentic
          ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-background to-emerald-500/10"
          : "border-red-500/30 bg-gradient-to-br from-red-500/5 via-background to-red-500/10"
      }`}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 0, transparent 50%)`,
        backgroundSize: '10px 10px',
      }} />

      {/* Watermark */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] text-8xl font-black tracking-wider select-none pointer-events-none">
        AUTHENTIK
      </div>

      <div className="relative z-10 text-center">
        {/* Shield icon */}
        <div
          className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
            authentic
              ? "bg-emerald-500/10 animate-pulse-glow"
              : "bg-red-500/10"
          }`}
          style={authentic ? { "--tw-shadow-color": "rgba(16, 185, 129, 0.3)" } as React.CSSProperties : {}}
        >
          {authentic ? (
            <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          ) : (
            <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Zm0 13.036h.008v.008H12v-.008Z" />
            </svg>
          )}
        </div>

        <h1 className={`text-3xl font-bold tracking-tight ${authentic ? "text-emerald-400" : "text-red-400"}`}>
          {authentic ? "Verified Authentic" : "Verification Failed"}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {authentic
            ? "This product has been cryptographically verified as genuine."
            : "This product could not be authenticated. Exercise caution."}
        </p>

        <div className="mt-6 space-y-1">
          <div className="text-xs text-muted-foreground">Brand</div>
          <div className="text-lg font-semibold">{brandName}</div>
        </div>
        <div className="mt-3 space-y-1">
          <div className="text-xs text-muted-foreground">Product</div>
          <div className="text-base font-medium">{productName}</div>
        </div>

        {/* Hash fingerprint */}
        <div className="mt-6 mx-auto max-w-xs">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            Certificate Fingerprint
          </div>
          <div className="font-mono text-[11px] text-muted-foreground/70 break-all leading-relaxed bg-secondary/30 rounded-lg px-3 py-2">
            {hash}
          </div>
        </div>

        {/* Timestamp */}
        <div className="mt-4 text-[10px] text-muted-foreground/50">
          Verified on {new Date().toLocaleString()} via Authentik
        </div>
      </div>
    </div>
  );
}
