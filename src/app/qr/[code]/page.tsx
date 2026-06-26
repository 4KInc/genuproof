"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";

interface ProductInfo {
  authentic: boolean;
  product?: {
    brandName: string;
    name: string;
    sku?: string;
    hash: string;
    createdAt: string;
    verificationCode: string;
  };
}

export default function QRPage() {
  const params = useParams();
  const code = params.code as string;
  const [info, setInfo] = useState<ProductInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/products/verify?code=${code}&metadata=true`);
        const data = await res.json();
        setInfo(data);
      } catch {
        setInfo(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <div className="max-w-[600px] mx-auto px-6 py-10">
          <div className="border border-border bg-card rounded-lg overflow-hidden">
            <div className="skeleton h-1 w-full rounded-none" />
            <div className="p-8 md:p-10 space-y-6">
              <div className="text-center">
                <div className="skeleton h-3 w-40 mx-auto mb-2" />
                <div className="skeleton h-3 w-28 mx-auto" />
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-center">
                <div className="skeleton w-[200px] h-[200px] rounded-md" />
              </div>
              <div className="text-center">
                <div className="skeleton h-3 w-48 mx-auto mb-2" />
                <div className="skeleton h-3 w-24 mx-auto" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const product = info?.product;

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <div className="max-w-[600px] mx-auto px-6 py-16 text-center">
          <svg className="w-10 h-10 text-destructive/20 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p className="text-[14px] text-muted-foreground mb-1">Product not found</p>
          <p className="text-[12px] text-muted-foreground/50 mb-4">The verification code &ldquo;{code}&rdquo; could not be found.</p>
          <Link href="/verify" className="text-[12px] text-primary hover:text-primary/80 font-medium transition-colors">
            Try another code
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="no-print">
        <SiteNav />
      </div>

      <div className="max-w-[600px] mx-auto px-6 py-10">
        {/* Certificate card */}
        <div className="border border-border bg-card rounded-lg overflow-hidden guilloche">
          <div className={`h-1 ${info?.authentic ? "bg-primary" : "bg-destructive"}`} />

          <div className="p-8 md:p-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
                Certificate of Authenticity
              </div>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-[10px] text-primary font-medium tracking-wide uppercase">
                  Verified Authentic
                </span>
              </div>
            </div>

            <div className="h-px bg-border mb-8" />

            {/* QR Code */}
            <div className="flex justify-center mb-8">
              <div className="p-4 bg-card border border-border rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/products/qr?code=${code}&format=png`}
                  alt={`QR code for ${code}`}
                  width={200}
                  height={200}
                  className="w-[200px] h-[200px]"
                />
              </div>
            </div>

            {/* Scan instruction */}
            <div className="text-center mb-8">
              <p className="text-[12px] text-muted-foreground">
                Scan this code to verify product authenticity
              </p>
              <p className="text-[11px] font-mono text-muted-foreground/50 mt-1">
                {code}
              </p>
            </div>

            <div className="h-px bg-border mb-6" />

            {/* Product info */}
            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
              <div>
                <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-0.5">Brand</div>
                <div className="font-[family-name:var(--font-display)] text-lg">{product.brandName}</div>
              </div>
              <div>
                <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-0.5">Product</div>
                <div className="text-[13px]">{product.name}</div>
              </div>
              {product.sku && (
                <div>
                  <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-0.5">SKU</div>
                  <div className="text-[12px] font-mono">{product.sku}</div>
                </div>
              )}
              <div>
                <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-0.5">Registered</div>
                <div className="text-[12px]">
                  {new Date(product.createdAt).toLocaleDateString("en-US", {
                    year: "numeric", month: "long", day: "numeric",
                  })}
                </div>
              </div>
            </div>

            <div className="h-px bg-border my-6" />

            {/* Hash */}
            <div>
              <div className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground mb-1.5">
                SHA-256 Fingerprint
              </div>
              <div className="font-mono text-[9px] text-muted-foreground/60 break-all bg-secondary/50 border border-border rounded-md px-3 py-2 leading-relaxed">
                {product.hash}
              </div>
            </div>

            <div className="h-px bg-border my-6" />

            {/* Actions */}
            <div className="flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <Link
                  href={`/verify/${code}`}
                  className="text-[11px] px-4 py-2 bg-primary text-primary-foreground font-medium tracking-wide rounded-md hover:bg-primary/90 transition-all"
                >
                  View Full Certificate
                </Link>
                <a
                  href={`/api/products/qr?code=${code}&format=png`}
                  download={`genuproof-${code}.png`}
                  className="text-[11px] px-4 py-2 border border-border rounded-md hover:bg-secondary transition-all"
                >
                  Download QR
                </a>
              </div>
              <button
                onClick={() => window.print()}
                className="text-[11px] px-4 py-2 border border-border rounded-md hover:bg-secondary transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 7.131H5.25" />
                </svg>
                Print
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] text-muted-foreground/40 mt-6 no-print">
          This certificate can be printed and included with the product packaging.
        </p>
      </div>
    </div>
  );
}
