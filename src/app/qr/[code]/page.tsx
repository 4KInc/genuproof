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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[12px] text-muted-foreground">Loading certificate...</div>
      </div>
    );
  }

  const product = info?.product;

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />

      <div className="max-w-[600px] mx-auto px-6 py-10">
        {/* Certificate card */}
        <div className="border border-border bg-card guilloche">
          <div className={`h-1 ${product ? "bg-primary" : "bg-destructive"}`} />

          <div className="p-8 md:p-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
                Certificate of Authenticity
              </div>
              {product && (
                <div className="mt-1 flex items-center justify-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-[10px] text-primary font-medium tracking-wide uppercase">
                    Verified Authentic
                  </span>
                </div>
              )}
            </div>

            <div className="h-px bg-border mb-8" />

            {/* QR Code */}
            <div className="flex justify-center mb-8">
              <div className="p-4 bg-white border border-border">
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

            {product && (
              <>
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
                  <div className="font-mono text-[9px] text-muted-foreground/60 break-all bg-secondary/50 border border-border px-3 py-2 leading-relaxed">
                    {product.hash}
                  </div>
                </div>
              </>
            )}

            <div className="h-px bg-border my-6" />

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Link
                href={`/verify/${code}`}
                className="text-[11px] px-4 py-2 bg-primary text-primary-foreground font-medium tracking-wide hover:bg-primary/90 transition-colors"
              >
                View Full Certificate
              </Link>
              <a
                href={`/api/products/qr?code=${code}&format=png`}
                download={`genuproof-${code}.png`}
                className="text-[11px] px-4 py-2 border border-border hover:bg-secondary transition-colors"
              >
                Download QR
              </a>
            </div>
          </div>
        </div>

        {/* Print-friendly note */}
        <p className="text-center text-[10px] text-muted-foreground/40 mt-6">
          This certificate can be printed and included with the product packaging.
        </p>
      </div>
    </div>
  );
}
