export interface Brand {
  id: string;
  name: string;
  domain: string;
  logoUrl?: string;
  industry: string;
  plan: "free" | "pro" | "enterprise";
  createdAt: string;
  productCount: number;
  scanCount: number;
}

export interface Product {
  productId: string;
  brandId: string;
  brandName: string;
  name: string;
  sku?: string;
  category?: string;
  description?: string;
  imageUrl?: string;
  verificationCode: string;
  hash: string;
  signature: string;
  status: "active" | "recalled" | "transferred" | "flagged";
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ProvenanceEvent {
  productId: string;
  type:
    | "manufactured"
    | "shipped"
    | "received"
    | "inspected"
    | "sold"
    | "transferred"
    | "recalled"
    | "custom";
  actor: string;
  location?: string;
  coordinates?: { lat: number; lng: number };
  timestamp: string;
  data?: Record<string, unknown>;
  hash: string;
  previousHash: string;
}

export interface ScanRecord {
  productId: string;
  timestamp: string;
  ip?: string;
  country?: string;
  city?: string;
  userAgent?: string;
  result: "authentic" | "suspicious" | "counterfeit" | "unknown";
}

export interface ThreatAlert {
  brandId: string;
  type:
    | "duplicate_scan"
    | "geographic_anomaly"
    | "burst_scan"
    | "scan_velocity"
    | "claimed_product_scan"
    | "ownership_dispute"
    | "invalid_code"
    | "domain_impersonation";
  severity: "low" | "medium" | "high" | "critical";
  productId?: string;
  details: string;
  timestamp: string;
  resolved: boolean;
}

export interface VerificationResult {
  authentic: boolean;
  product?: Product;
  events?: ProvenanceEvent[];
  warnings?: string[];
  scanCount: number;
  certificate?: {
    hash: string;
    signatureValid: boolean;
    chainIntegrity: boolean;
    merkleRoot?: string;
  };
}
