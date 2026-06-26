import { NextRequest, NextResponse } from "next/server";
import { getItem, putItem, queryItems, incrementCounter } from "@/lib/dynamodb";
import { verifySignature, hashProductRecord, sha256 } from "@/lib/crypto";
import type { VerificationResult, ThreatAlert } from "@/lib/types";

const SIGNING_SECRET = process.env.SIGNING_SECRET || "genuproof-dev-secret";

// Geo lookup: prefer Vercel's built-in geo headers, fallback to ip-api
function geoFromHeaders(req: NextRequest): { country: string; city: string } | null {
  const country = req.headers.get("x-vercel-ip-country");
  const city = req.headers.get("x-vercel-ip-city");
  if (country && country !== "XX") {
    return { country, city: city ? decodeURIComponent(city) : "Unknown" };
  }
  return null;
}

async function geolocateIP(ip: string, req: NextRequest): Promise<{ country: string; city: string }> {
  // 1. Try Vercel geo headers first (free, instant, no external call)
  const vercelGeo = geoFromHeaders(req);
  if (vercelGeo) return vercelGeo;

  // 2. Skip for local/unknown IPs
  if (ip === "127.0.0.1" || ip === "::1" || ip === "unknown") {
    return { country: "Local", city: "Localhost" };
  }

  // 3. Fallback to ip-api (HTTPS endpoint)
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.country_name && !data.error) {
        return { country: data.country_name, city: data.city || "Unknown" };
      }
    }
  } catch {
    // Geo lookup is best-effort
  }
  return { country: "Unknown", city: "Unknown" };
}

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");
    const productId = req.nextUrl.searchParams.get("productId");
    const metadataOnly = req.nextUrl.searchParams.get("metadata") === "true";

    if (!code && !productId) {
      return NextResponse.json(
        { error: "code or productId is required" },
        { status: 400 }
      );
    }

    // Resolve product ID from verification code
    let resolvedProductId = productId;
    let resolvedBrandId: string | undefined;

    if (code) {
      const codeLookup = await getItem(`VERIFY#${code}`, "META");
      if (!codeLookup) {
        return NextResponse.json(
          { authentic: false, error: "Invalid verification code" },
          { status: 404 }
        );
      }
      resolvedProductId = codeLookup.productId as string;
      resolvedBrandId = codeLookup.brandId as string;
    }

    // Fetch product
    const product = await getItem(`PRODUCT#${resolvedProductId}`, "META");
    if (!product) {
      return NextResponse.json(
        { authentic: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Verify cryptographic integrity
    const recordHash = hashProductRecord({
      productId: product.productId as string,
      brandId: product.brandId as string,
      name: product.name as string,
      sku: product.sku as string | undefined,
      metadata: product.metadata as Record<string, unknown>,
      createdAt: product.createdAt as string,
    });

    const hashMatch = recordHash === product.hash;
    const signatureValid = verifySignature(
      product.hash as string,
      product.signature as string,
      SIGNING_SECRET
    );

    // Fetch provenance chain
    const events = await queryItems(
      `PRODUCT#${resolvedProductId}`,
      "EVENT#",
      { scanForward: true }
    );

    // Verify chain integrity
    let chainIntegrity = true;
    for (let i = 1; i < events.length; i++) {
      if (events[i].previousHash !== events[i - 1].hash) {
        chainIntegrity = false;
        break;
      }
    }

    const now = new Date().toISOString();
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const warnings: string[] = [];
    const geo = metadataOnly ? { country: "Unknown", city: "Unknown" } : await geolocateIP(ip, req);

    // Only record scans and run anomaly detection for real verifications (not metadata/OG fetches)
    if (!metadataOnly) {

      const scanRecord = {
        PK: `PRODUCT#${resolvedProductId}`,
        SK: `SCAN#${now}`,
        productId: resolvedProductId,
        timestamp: now,
        ip,
        country: geo.country,
        city: geo.city,
        userAgent: req.headers.get("user-agent") || "unknown",
        result: hashMatch && signatureValid ? "authentic" : "suspicious",
      };

      await Promise.all([
        putItem(scanRecord),
        incrementCounter(
          `PRODUCT#${resolvedProductId}`,
          "META",
          "scanCount"
        ),
        incrementCounter(
          `BRAND#${product.brandId}`,
          "STATS",
          "scanCount"
        ),
      ]);

      // Anomaly detection: check recent scans for this product
      const recentScans = await queryItems(
        `PRODUCT#${resolvedProductId}`,
        "SCAN#",
        { limit: 20 }
      );

      // Detect geographic anomaly: same product scanned from different countries in short window
      const countries = new Set(
        recentScans
          .filter((s) => {
            const scanTime = new Date(s.timestamp as string).getTime();
            return Date.now() - scanTime < 24 * 60 * 60 * 1000; // last 24h
          })
          .map((s) => s.country)
      );
      if (countries.size > 2) {
        warnings.push(
          `Product scanned from ${countries.size} different countries in 24h`
        );
        await createThreatAlert({
          brandId: (resolvedBrandId || product.brandId) as string,
          type: "geographic_anomaly",
          severity: "high",
          productId: resolvedProductId!,
          details: `Scanned from ${[...countries].join(", ")} in 24h window`,
          timestamp: now,
          resolved: false,
          country: geo.country,
          city: geo.city,
        });
      }

      // Detect burst scanning: many scans in short window
      const recentBurstScans = recentScans.filter((s) => {
        const scanTime = new Date(s.timestamp as string).getTime();
        return Date.now() - scanTime < 60 * 60 * 1000; // last hour
      });
      if (recentBurstScans.length > 10) {
        warnings.push(
          `Unusual scan volume: ${recentBurstScans.length} scans in the last hour`
        );
        await createThreatAlert({
          brandId: (resolvedBrandId || product.brandId) as string,
          type: "burst_scan",
          severity: "medium",
          productId: resolvedProductId!,
          details: `${recentBurstScans.length} scans in 1 hour`,
          timestamp: now,
          resolved: false,
          country: geo.country,
          city: geo.city,
        });
      }

      // ── Scan velocity detection (anti-tag-cloning at scale) ──
      const totalScans = ((product.scanCount as number) || 0) + 1;
      const daysSinceRegistration = Math.max(
        1,
        (Date.now() - new Date(product.createdAt as string).getTime()) / (1000 * 60 * 60 * 24)
      );
      const scansPerDay = totalScans / daysSinceRegistration;

      if (totalScans > 20 && scansPerDay > 5) {
        warnings.push(
          `Abnormal scan velocity: ${totalScans} total scans (${scansPerDay.toFixed(1)}/day avg). ` +
          `A single authentic product typically has fewer scans. This may indicate cloned tags.`
        );
        await createThreatAlert({
          brandId: (resolvedBrandId || product.brandId) as string,
          type: "scan_velocity",
          severity: "high",
          productId: resolvedProductId!,
          details: `Scan velocity ${scansPerDay.toFixed(1)}/day over ${Math.round(daysSinceRegistration)} days (${totalScans} total). Possible tag cloning.`,
          timestamp: now,
          resolved: false,
          country: geo.country,
          city: geo.city,
        });
      }
    }

    if (!hashMatch) {
      warnings.push("Product record hash mismatch — possible tampering");
    }

    // ── Claim-based detection (anti-tag-cloning) ──
    const claim = await getItem(`PRODUCT#${resolvedProductId}`, "CLAIM");
    let claimInfo: {
      claimed: boolean;
      claimedAt?: string;
      claimedBy?: string;
      isClaimant: boolean;
    } = { claimed: false, isClaimant: false };

    if (claim) {
      const userAgent = req.headers.get("user-agent") || "unknown";
      const scannerFingerprint = sha256(`${ip}:${userAgent}`);
      const isOriginalClaimant = scannerFingerprint === claim.fingerprint;

      claimInfo = {
        claimed: true,
        claimedAt: claim.claimedAt as string,
        claimedBy: claim.consumerName as string,
        isClaimant: isOriginalClaimant,
      };

      if (!metadataOnly && !isOriginalClaimant) {
        warnings.push(
          "This product has been registered to another consumer. " +
          "If you purchased this product new, it may be a counterfeit with a cloned tag."
        );
        await createThreatAlert({
          brandId: (resolvedBrandId || product.brandId) as string,
          type: "duplicate_scan",
          severity: "high",
          productId: resolvedProductId!,
          details: `Claimed product scanned by different device. Original claim: ${claim.claimedAt}. Possible cloned tag.`,
          timestamp: now,
          resolved: false,
          country: geo.country,
          city: geo.city,
        });
      }
    }

    const result: VerificationResult = {
      authentic: hashMatch && signatureValid,
      product: {
        productId: product.productId as string,
        brandId: product.brandId as string,
        brandName: product.brandName as string,
        name: product.name as string,
        sku: product.sku as string | undefined,
        category: product.category as string | undefined,
        description: product.description as string | undefined,
        imageUrl: product.imageUrl as string | undefined,
        verificationCode: product.verificationCode as string,
        hash: product.hash as string,
        signature: product.signature as string,
        status: product.status as "active" | "recalled" | "transferred" | "flagged",
        createdAt: product.createdAt as string,
        updatedAt: product.updatedAt as string,
      },
      events: events.map((e) => ({
        productId: e.productId as string,
        type: e.type as ProvenanceEvent["type"],
        actor: e.actor as string,
        location: e.location as string | undefined,
        timestamp: e.timestamp as string,
        hash: e.hash as string,
        previousHash: e.previousHash as string,
        data: e.data as Record<string, unknown> | undefined,
      })),
      warnings,
      scanCount: (product.scanCount as number) || 0,
      certificate: {
        hash: product.hash as string,
        signatureValid,
        chainIntegrity,
      },
    };

    return NextResponse.json({ ...result, claim: claimInfo });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}

type ProvenanceEvent = {
  type:
    | "manufactured"
    | "shipped"
    | "received"
    | "inspected"
    | "sold"
    | "transferred"
    | "recalled"
    | "custom";
};

async function createThreatAlert(alert: ThreatAlert) {
  await putItem({
    PK: `THREAT#${alert.brandId}`,
    SK: `ALERT#${alert.timestamp}`,
    GSI1PK: `BRAND#${alert.brandId}`,
    GSI1SK: `THREAT#${alert.timestamp}`,
    ...alert,
  });
}
