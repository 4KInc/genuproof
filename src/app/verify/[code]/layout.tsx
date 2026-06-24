import type { Metadata } from "next";

type Props = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;

  // Try to fetch product info for rich metadata
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://genuproof.com";
  let title = `Verify Product — GenuProof`;
  let description = `Verify the authenticity of this product using cryptographic proof.`;
  let ogUrl = `${baseUrl}/api/og?status=authentic`;

  try {
    const res = await fetch(`${baseUrl}/api/products/verify?code=${code}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.product) {
        title = `${data.product.name} — ${data.authentic ? "Verified" : "Unverified"} | GenuProof`;
        description = `${data.product.brandName} — ${data.product.name}. ${data.authentic ? "Cryptographically verified as authentic." : "Verification failed."}`;
        ogUrl = `${baseUrl}/api/og?brand=${encodeURIComponent(data.product.brandName)}&product=${encodeURIComponent(data.product.name)}&status=${data.authentic ? "authentic" : "failed"}&hash=${data.product.hash || ""}`;
      }
    }
  } catch {
    // Use defaults
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl],
    },
  };
}

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
