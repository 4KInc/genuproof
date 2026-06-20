import { createHash, createHmac, randomBytes } from "crypto";

// SHA-256 hash of arbitrary data
export function sha256(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

// Generate a unique product verification code (URL-safe, 12 chars)
export function generateVerificationCode(): string {
  return randomBytes(9).toString("base64url"); // 12 chars
}

// Generate a unique product ID
export function generateProductId(): string {
  return randomBytes(16).toString("hex");
}

// HMAC-based signature for tamper evidence
export function signData(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("hex");
}

// Verify HMAC signature
export function verifySignature(
  data: string,
  signature: string,
  secret: string
): boolean {
  const expected = signData(data, secret);
  if (expected.length !== signature.length) return false;
  // Constant-time comparison
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

// Build a Merkle tree from an array of hashes, return the root
export function merkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return sha256("");
  if (hashes.length === 1) return hashes[0];

  const nextLevel: string[] = [];
  for (let i = 0; i < hashes.length; i += 2) {
    const left = hashes[i];
    const right = i + 1 < hashes.length ? hashes[i + 1] : left;
    nextLevel.push(sha256(left + right));
  }
  return merkleRoot(nextLevel);
}

// Hash a product record into a canonical digest
export function hashProductRecord(record: {
  productId: string;
  brandId: string;
  name: string;
  sku?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}): string {
  const canonical = JSON.stringify({
    productId: record.productId,
    brandId: record.brandId,
    name: record.name,
    sku: record.sku || "",
    metadata: record.metadata || {},
    createdAt: record.createdAt,
  });
  return sha256(canonical);
}

// Hash a provenance event
export function hashEvent(event: {
  productId: string;
  type: string;
  actor: string;
  timestamp: string;
  data?: Record<string, unknown>;
  previousHash: string;
}): string {
  const canonical = JSON.stringify({
    productId: event.productId,
    type: event.type,
    actor: event.actor,
    timestamp: event.timestamp,
    data: event.data || {},
    previousHash: event.previousHash,
  });
  return sha256(canonical);
}
