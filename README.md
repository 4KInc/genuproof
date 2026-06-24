# GenuProof

**Anti-counterfeiting & product authentication platform.**

Cryptographic certificates that travel with your product from factory to consumer. One scan to verify. One tampered byte to detect. Built on DynamoDB for verification at any scale.

**Live:** https://genuproof.com

---

## What It Does

GenuProof gives brands cryptographic proof of product authenticity. Every registered product receives a unique SHA-256 hash, HMAC-SHA256 signature, and verification code with QR. As products move through the supply chain, each event is cryptographically linked to the previous one in a tamper-evident hash chain. Consumers scan a QR code to instantly verify authenticity — no app, no wallet, one scan.

The platform includes real-time threat intelligence powered by DynamoDB Streams, AWS Lambda, and **Gemini 2.5 Flash**: every verification scan is captured by a stream, processed by Lambda for anomaly detection, classified by Gemini AI (severity, attack vector, confidence score, natural-language narrative), and alerts are pushed to the brand's dashboard in real time via Server-Sent Events. The AI operations log records every Gemini call with latency, tokens, and classification results.

**Pricing:** Starter (Free, 10 products) · Brand ($99/month, 500 products + AI threat detection) · Business ($299/month, unlimited + EU DPP export + API webhooks). Stripe checkout live at `/pricing`.

**EU DPP Compliance:** ESPR-2024/1781 compatible JSON export at `/api/products/dpp-export`. Batteries mandatory now, textiles and electronics mandatory 2027.

## Architecture

```
Consumer scans QR
        │
        ▼
Vercel (Next.js 16, Serverless Functions)
  Static Pages ─── API Routes (27 endpoints)
  Crypto Module: SHA-256, HMAC-SHA256, Merkle Trees
  SSE Endpoint ◄──────────────────────────────┐
        │                                     │
        ▼                                     │
AWS DynamoDB (us-east-1, PAY_PER_REQUEST)     │
  Single-table design: PK/SK + GSI1           │
  Streams enabled (NEW_IMAGE)                 │
        │                                     │
        ▼                                     │
DynamoDB Streams                              │
        │                                     │
        ▼                                     │
AWS Lambda (authentik-threat-detector)        │
  Geographic anomaly detection                │
  Burst scan detection                        │
  Hash tampering detection                    │
        │                                     │
        ▼                                     │
  Writes THREAT alert to DynamoDB ────────────┘
        │
        ▼
  Dashboard lights up in real time (no refresh)
```

**Architecture diagram:** https://genuproof.com/architecture.svg

### DynamoDB Single-Table Design

**Table:** `authentik` · **Region:** us-east-1 · **Billing:** PAY_PER_REQUEST · **Streams:** NEW_IMAGE

#### Entity Schema (PK/SK Patterns)

| PK | SK | Purpose | Write Sharding |
|---|---|---|---|
| `BRAND#id` | `PROFILE` | Brand record | Per-brand partition |
| `BRAND#id` | `STATS` | Aggregate counters (atomic increment) | Per-brand partition |
| `BRAND#id` | `WEBHOOK#id` | Webhook configuration | Per-brand partition |
| `PRODUCT#id` | `META` | Product + SHA-256 hash + HMAC signature | Per-product partition |
| `PRODUCT#id` | `EVENT#ts#type` | Hash-chained provenance event | Per-product partition |
| `PRODUCT#id` | `SCAN#ts` | Verification scan log | Per-product partition |
| `PRODUCT#id` | `CLAIM` | Consumer ownership lock (device fingerprint) | Per-product partition |
| `VERIFY#code` | `META` | O(1) verification code → product lookup | Per-code partition |
| `HASH#sha256` | `META` | Hash → product lookup (tamper detection) | Per-hash partition |
| `THREAT#brand#YYYY-MM` | `ALERT#ts#type` | Threat alert (monthly-bucketed) | Per-brand-month partition |
| `OPS_LOG#YYYY-MM-DD` | `ts#agent` | AI ops log (daily-bucketed) | Per-day partition |
| `BRAND_INDEX` | `BRAND#ts#id` | Brand collection (no-Scan listing) | Single collection |
| `PRODUCT_INDEX` | `PRODUCT#ts#id` | Product collection (no-Scan explore/analytics) | Single collection |

#### GSI1 (Cross-Partition Queries)

| GSI1PK | GSI1SK | Access Pattern |
|---|---|---|
| `BRAND#id` | `PRODUCT#ts` | Products by brand, sorted by date |
| `BRAND#id` | `THREAT#ts` | Threats by brand across monthly buckets |
| `VERIFY#code` | `META` | Verification code lookup (GSI projection) |
| `OPS_LOG` | `ts` | AI operations across daily buckets |

#### Access Pattern Matrix

| Access Pattern | Operation | Key Condition | Index | Scan? |
|---|---|---|---|---|
| Register brand | PutItem | `BRAND#id / PROFILE` + `BRAND_INDEX / BRAND#ts` | Table | No |
| Get brand profile | GetItem | `BRAND#id / PROFILE` | Table | No |
| List all brands | Query | `BRAND_INDEX / begins_with(BRAND#)` | Table | No |
| Brand statistics | GetItem | `BRAND#id / STATS` | Table | No |
| Register product | PutItem | `PRODUCT#id / META` + `VERIFY#code / META` + `HASH# / META` + `PRODUCT_INDEX / PRODUCT#ts` | Table | No |
| Verify product | GetItem → Query | `VERIFY#code / META` → `PRODUCT#id / META` → `PRODUCT#id / EVENT#` | Table | No |
| List products by brand | Query | `GSI1PK=BRAND#id / begins_with(PRODUCT#)` | GSI1 | No |
| Explore all products | Query | `PRODUCT_INDEX / begins_with(PRODUCT#)` | Table | No |
| Add provenance event | PutItem | `PRODUCT#id / EVENT#ts#type` | Table | No |
| Get provenance chain | Query | `PRODUCT#id / begins_with(EVENT#)` | Table | No |
| Record scan | PutItem | `PRODUCT#id / SCAN#ts` | Table | No |
| Get scan history | Query | `PRODUCT#id / begins_with(SCAN#)` | Table | No |
| Write threat alert | PutItem | `THREAT#brand#YYYY-MM / ALERT#ts` | Table | No |
| Get threats by brand | Query | `GSI1PK=BRAND#id / begins_with(THREAT#)` | GSI1 | No |
| Write AI ops log | PutItem | `OPS_LOG#YYYY-MM-DD / ts#agent` | Table | No |
| Read AI ops log | Query (scatter-gather) | `OPS_LOG#YYYY-MM-DD` × N days | Table | No |
| Claim product | PutItem | `PRODUCT#id / CLAIM` | Table | No |
| Health check | Scan(Limit:1) | — | Table | 1 item only |

**Design decisions:**
- **Time-bucketed sharding** on OPS_LOG (daily) and THREAT (monthly) prevents write-hot-spotting on high-throughput partitions. Dashboard reads scatter-gather across recent buckets.
- **Collection keys** (`BRAND_INDEX`, `PRODUCT_INDEX`) eliminate full-table Scans for listing operations. Each entity registration writes an additional index entry.
- **GSI1** serves cross-partition queries: products-by-brand, threats-by-brand (across monthly buckets), and verification code lookups.
- **Zero Scans** on data paths. The only Scan is the health-check probe (Limit: 1, SELECT: COUNT) for DynamoDB connectivity testing.
- **Atomic counters** on BRAND#id/STATS avoid read-modify-write races on productCount/scanCount/threatCount.

### DynamoDB Streams + Lambda + Gemini Pipeline

Every write to the `authentik` table is captured by DynamoDB Streams (NEW_IMAGE). The `authentik-threat-detector` Lambda function is triggered on SCAN# and EVENT# inserts with a batch size of 10 and a 5-second batching window. The Lambda runs four anomaly checks:

1. **Geographic anomaly:** Queries recent scans for the same product. If scanned from 3+ countries within 24 hours, generates a HIGH severity alert.
2. **Burst scanning:** Counts scans within the last hour. If 10+ scans detected, generates a MEDIUM severity alert (possible counterfeit code testing).
3. **Claim violation:** If a product has already been claimed by a consumer and is scanned by a different device, generates a HIGH severity alert (tag-cloning indicator).
4. **Hash tampering:** If the verification result was anything other than "authentic", generates a CRITICAL severity alert.

When any check fires, the Lambda calls **Gemini 2.5 Flash** with the full threat context. Gemini returns: severity (LOW/MEDIUM/HIGH/CRITICAL), attack_vector (tag_cloning/burst_testing/geographic_distribution/hash_tampering/unauthorized_resale), a 2-3 sentence narrative, recommended brand actions, and a confidence score (0-100).

A second Gemini integration point — the **Chain Gap Analyst** — triggers when a provenance event reveals a temporal gap >72 hours, analyzing possible causes (customs hold, carrier switch, unauthorized storage, cold chain breach).

Every Gemini call is logged to daily-bucketed `OPS_LOG#YYYY-MM-DD` partitions in DynamoDB with agent name, trigger type, anomaly flags, severity, attack vector, confidence, and latency. Time-bucketed sharding prevents write-hot-spotting — the dashboard scatter-gathers across recent daily buckets. The `/ops-log` page exposes this as a live auto-refreshing dashboard.

Alerts are written back to DynamoDB with `source: "lambda-stream"`. The SSE endpoint (`/api/stream`) polls for new threats every 3 seconds and streams them to the dashboard's `LiveThreats` component, which flashes on new alerts with no page refresh needed.

### Cryptographic Design (5 Primitives)

1. **Product Hash:** `hash = SHA-256(canonical JSON)` — deterministic product fingerprint
2. **HMAC Signature:** `signature = HMAC-SHA256(hash, server_secret)` — server-authenticated integrity
3. **Provenance Chain:** `event.hash = SHA-256(event_data + previous_event.hash)` — tamper-evident linked chain
4. **Device Fingerprint:** `fingerprint = SHA-256(ip + userAgent)` — anti-tag-cloning claim lock
5. **Email Privacy Hash:** `emailHash = SHA-256(email)` — consumer identity without PII storage

**Verification:** Recompute hash from stored fields, verify HMAC, walk the chain checking each link. All in one scan, under one second.

**Anti-Tag-Cloning (5 layers):** Claim lock (device fingerprint) → Scan velocity (scans/day over lifetime) → Burst detection (10+ scans/hour) → Geographic anomaly (3+ countries/24h) → Dispute flow (consumer ownership challenge)

## Pages (15)

| Page | Route | Description |
|---|---|---|
| Landing | `/` | Hero, features, stats, hash ticker, certificate preview, dark mode toggle |
| Dashboard | `/dashboard` | Brand selector, 5 tabs: Overview (live threat feed + activity), Register, Products, Supply Chain, Threats |
| Verify (entry) | `/verify` | Verification code input |
| Verify (result) | `/verify/[code]` | Animated verification, certificate, provenance chain, share/export actions |
| QR Certificate | `/qr/[code]` | Printable branded QR certificate with product details |
| Product Detail | `/product/[id]` | Full product view, crypto identity, QR, scan history table, provenance |
| Pricing | `/pricing` | Three tiers (Starter/Brand/Business) with Stripe checkout |
| Explore | `/explore` | Public product gallery with category filters |
| Compare | `/compare` | Side-by-side product verification comparison |
| Analytics | `/analytics` | Platform analytics: daily scans, hourly distribution, geo, categories, status |
| Integrations | `/integrations` | Supply chain integration docs (Shipping, POS, Warehouse) + simulation panel with 4 journey templates |
| Ops Log | `/ops-log` | AI operations dashboard: Gemini call log with severity, attack vector, confidence, latency |
| Status | `/status` | Live platform status with 8 service checks and latency measurements |
| API Docs | `/docs` | Full API reference with request/response examples |
| Embed Badge | `/embed/[code]` | Embeddable verification widget (iframe-ready) |

## API Endpoints (37)

### Brands
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/brands` | Register a new brand |
| `GET` | `/api/brands?id=X` | Get brand profile |
| `GET` | `/api/brands/list` | List all registered brands |
| `GET` | `/api/brands/stats?brandId=X` | Real-time brand statistics |

### Products
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/products/register` | Register product with SHA-256 hash + HMAC signature |
| `POST` | `/api/products/batch` | Batch register up to 50 products |
| `GET` | `/api/products/verify?code=X` | Verify product + anomaly detection |
| `GET` | `/api/products/list?brandId=X` | List products by brand (GSI1) |
| `GET` | `/api/products/search?code=X` | Search by code, product ID, or brand |
| `POST` | `/api/products/events` | Add hash-chained provenance event |
| `POST` | `/api/products/history` | Bulk provenance: same event to multiple products |
| `POST` | `/api/products/transfer` | Ownership transfer with chain event |
| `POST` | `/api/products/recall` | Product recall with critical alert |
| `POST` | `/api/products/claim` | Consumer claim with device fingerprint lock |
| `POST` | `/api/products/dispute` | Consumer ownership dispute |
| `GET` | `/api/products/certificate?code=X` | Export full cryptographic certificate (JSON) |
| `GET` | `/api/products/qr?code=X` | Generate QR code (PNG or SVG) |
| `GET` | `/api/products/dpp-export?code=X` | EU Digital Product Passport export (ESPR-2024/1781) |

### Webhook Ingestion
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ingest/shipping` | Carrier webhooks (FedEx, DHL, UPS, USPS, Chronopost) |
| `POST` | `/api/ingest/pos` | POS webhooks (Shopify, Square, WooCommerce, Stripe) |
| `POST` | `/api/ingest/warehouse` | WMS webhooks (SAP, Oracle, Manhattan, custom) |

### Integrations
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/integrations/configure` | Configure integration (generates ingest key) |
| `POST` | `/api/integrations/simulate` | Run supply chain simulation |
| `GET` | `/api/integrations/status` | Integration status |
| `GET` | `/api/integrations/journeys` | Available journey templates (4 industries) |

### Threat Intelligence & AI
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/threats?brandId=X` | Fetch threat alerts for a brand |
| `GET` | `/api/ops-log?limit=50` | Gemini AI operations log (agent, severity, confidence, latency) |
| `GET` | `/api/scans?productId=X` | Scan history with location aggregation |
| `GET` | `/api/stream?brandId=X` | Server-Sent Events for real-time threat alerts |

### Catalog
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/catalog/categories` | 14 product categories |
| `GET` | `/api/catalog/actors` | 37 supply chain actors (carriers, warehouses, inspection, retailers) |
| `GET` | `/api/catalog/locations` | 37 geographic locations (manufacturing, distribution, retail) |

### Stripe
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/stripe/checkout` | Create Stripe checkout session (subscription) |

### Platform
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analytics` | Aggregated platform analytics |
| `GET` | `/api/audit?limit=30` | Platform-wide audit log |
| `GET` | `/api/explore?limit=50` | Public product listing |
| `GET` | `/api/health` | Health check with DB latency |
| `POST` | `/api/webhooks` | Register webhook URL |
| `GET` | `/api/webhooks?brandId=X` | List webhooks |
| `DELETE` | `/api/webhooks` | Delete webhook |

## Features

### Core Authentication
- SHA-256 product hashing with HMAC-SHA256 signatures
- Hash-chained provenance tracking (append-only, tamper-evident)
- Consumer verification with animated cryptographic checks
- QR code generation (PNG/SVG) with branded certificate pages
- Full certificate export as JSON

### Brand Management
- Multi-brand support with brand selector and switching
- Product registration (single + batch up to 50)
- Ownership transfer with chain-of-custody events
- Product recall with critical threat alerts
- Product status badges (active/recalled/transferred) with inline actions
- Real-time brand statistics

### Supply Chain
- Provenance event types: manufactured, shipped, received, inspected, sold, transferred, recalled
- Each event hash-chained to previous (break one link, entire chain flags)
- Bulk provenance: add same event to multiple products
- Expandable event details with hash verification

### Live Threat Intelligence (DynamoDB Streams + Lambda + Gemini)
- **DynamoDB Streams** captures every scan write in real time
- **AWS Lambda** (`authentik-threat-detector`, 412 LOC) processes stream events:
  - Geographic anomaly detection (3+ countries in 24 hours)
  - Burst scan detection (10+ scans per hour)
  - Claim violation detection (tag-cloning indicator)
  - Hash/signature tampering detection
- **Gemini 2.5 Flash** classifies threats: severity, attack vector, confidence score, natural-language narrative, recommended brand actions
- **Gemini Chain Gap Analyst**: temporal gaps >72h trigger supply chain risk analysis
- **AI Ops Log**: every Gemini call logged with agent, trigger, severity, confidence, latency → `/ops-log` dashboard
- Alerts written back to DynamoDB with `source: "lambda-stream"`
- **Server-Sent Events** (`/api/stream`) push alerts to dashboard in real time
- **LiveThreats component** connects via EventSource, flashes on new alerts
- Threat feed with severity levels (low/medium/high/critical)
- Webhook notifications for scans, threats, recalls

### Anti-Tag-Cloning System
The most common counterfeiting attack: buy one real product, scan its QR, clone the tag onto hundreds of fakes. GenuProof detects this with 5 layers:
1. **Claim lock:** First consumer scan locks product to device fingerprint
2. **Velocity detection:** Abnormal scans/day over product lifetime
3. **Burst detection:** 10+ scans in 1-hour window
4. **Geographic anomaly:** Same product scanned from 3+ countries in 24h
5. **Dispute flow:** Consumer ownership challenge with evidence collection

### Analytics
- Daily scan charts (7-day, CSS-only bar charts)
- Hourly scan distribution (24-hour pattern)
- Geographic scan breakdown by country
- Product category breakdown
- Status breakdown (active/recalled/transferred) with percentages
- Scan result breakdown (authentic vs suspicious)
- Real-time activity feed with 30s polling

### Developer Experience
- Full API documentation at `/docs` (27 endpoints documented)
- Embeddable verification badge (`/embed/[code]`)
- Dynamic OG images for social sharing (Edge runtime)
- Rich OpenGraph + Twitter Card metadata on verification pages
- Health endpoint with DynamoDB latency
- Platform-wide audit log
- Product comparison tool (`/compare`)

### Design
- Swiss Certificate aesthetic (Instrument Serif + warm paper tones)
- Dark mode with localStorage persistence and toggle
- Print-optimized QR certificates (`@media print`)
- Mobile-responsive with hamburger nav
- Guilloche CSS patterns on certificates
- Hash ticker marquee on landing page
- Grain noise overlay for tactile depth
- Editorial typography with uppercase micro-labels

### Supply Chain Integrations
- **Shipping:** FedEx, DHL, UPS, USPS, Chronopost webhook ingestion
- **POS:** Shopify, Square, WooCommerce, Stripe webhook ingestion
- **Warehouse:** WMS scanning (received, inspected, stored, dispatched, returned)
- **Integration configuration:** generates ingest keys per carrier/platform
- **4 simulation templates:** Luxury Watch, Fashion Handbag, Pharmaceutical, Electronics

### EU Digital Product Passport (DPP)
- ESPR-2024/1781 compatible JSON export at `/api/products/dpp-export`
- Product identification, manufacturer, supply chain traceability, cryptographic verification, sustainability fields
- Content-Disposition header for direct download
- Batteries mandatory now, textiles and electronics mandatory 2027

## Tech Stack

- **Frontend:** Next.js 16, TypeScript, Tailwind CSS
- **AI:** Gemini 2.5 Flash (`@google/generative-ai`) — threat classification + chain gap analysis
- **Database:** Amazon DynamoDB (single-table, PAY_PER_REQUEST, Streams enabled)
- **Compute:** AWS Lambda (Node.js 20, threat detection + Gemini integration)
- **Payments:** Stripe (subscription checkout, 3 tiers)
- **Deployment:** Vercel (auto-deploy on git push)
- **Real-time:** DynamoDB Streams + Lambda + Server-Sent Events
- **Cryptography:** Node.js `crypto` (SHA-256, HMAC-SHA256, Merkle trees)
- **Testing:** Playwright (24 e2e tests)
- **QR:** `qrcode` (npm)
- **Fonts:** Instrument Serif (display), Geist (body), Geist Mono (code)

## AWS Resources

| Resource | Details |
|---|---|
| DynamoDB Table | `authentik`, us-east-1, PAY_PER_REQUEST, Streams NEW_IMAGE, TTL enabled |
| Lambda Function | `authentik-threat-detector`, Node.js 20, 256MB, 30s timeout |
| IAM Role | `authentik-threat-detector-role`, DynamoDB + CloudWatch policies |
| Event Source Mapping | DynamoDB Stream → Lambda, batch_size=10, 5s window |

## Quick Start

```bash
# Clone
git clone https://github.com/4KInc/genuproof.git
cd authentik-platform

# Install
npm install

# Set up environment
cp .env.local.example .env.local
# Edit .env.local with your AWS credentials

# Create DynamoDB table with streams
bash scripts/create-table.sh authentik us-east-1

# Deploy Lambda (optional, for real-time threat detection)
cd lambda && zip -j /tmp/threat-detector.zip threat-detector.mjs
aws lambda create-function \
  --function-name authentik-threat-detector \
  --runtime nodejs20.x \
  --handler threat-detector.handler \
  --role <your-role-arn> \
  --zip-file fileb:///tmp/threat-detector.zip \
  --region us-east-1

# Run
npm run dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `AWS_REGION` | AWS region (default: `us-east-1`) |
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `DYNAMODB_TABLE` | Table name (default: `authentik`) |
| `SIGNING_SECRET` | HMAC signing secret |
| `NEXT_PUBLIC_BASE_URL` | Public URL for QR codes and OG images |

## Demo Products

| Product | Verification Code | Provenance |
|---|---|---|
| Royal Oak Chronograph 42mm | `wfPHybaFV3_a` | Switzerland to NYC (7 events) |
| Le Classique Tote - Noir | `pOszdB-1n6IC` | Florence to Madison Ave (6 events) |
| Oud Royale Eau de Parfum | `27dEHQymVRMl` | Grasse to Dubai (4 events) |
| Nautilus Travel Time 40mm | `FshGQLRNsr4p` | Le Locle to Tokyo (6 events) |
| Aviator Titanium Polarized | `IebJZgMHdD-h` | Belluno to Beverly Hills (4 events) |

**Verify any product:** `https://genuproof.com/verify/{code}`

## Testing

24 end-to-end Playwright tests covering all critical paths:

```bash
npm test              # Run all 24 tests
npm run test:ui       # Interactive Playwright UI
```

| Suite | Tests | Coverage |
|---|---|---|
| `api-health.spec.ts` | 4 | Health endpoint, 14 categories, 37 actors, 4 journey templates |
| `verification.spec.ts` | 5 | Authentic product verification (hash + signature + chain), error handling, verify page UI, direct URL, invalid code |
| `dpp-export.spec.ts` | 2 | EU DPP JSON export (ESPR-2024/1781, SHA-256, HMAC-SHA256), error handling |
| `dashboard.spec.ts` | 4 | Brand selector, overview tab, products tab, threats tab |
| `pages.spec.ts` | 9 | Landing, pricing, ops-log, docs, explore, QR certificate, product detail, integrations, status |

## Pre-existing Work

**Pre-existing (before May 19, 2026):**
- Next.js 16, React 19, Tailwind CSS v4 — open-source frameworks
- `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb` — AWS SDK
- `stripe` — Stripe SDK
- `qrcode`, `sharp`, `uuid`, `crypto-js` — open-source npm packages
- No application code, business logic, or UI existed before the hackathon period

**Built during the hackathon (May 19 - August 17, 2026):**
- All 37 API endpoints, 15 pages, and UI components
- Cryptographic design: SHA-256 hashing, HMAC-SHA256 signatures, hash-chained provenance, device fingerprinting, email privacy hashing
- DynamoDB single-table schema (11 PK/SK patterns, 2 GSIs)
- Lambda threat detector with Gemini 2.5 Flash integration (2 independent AI integration points)
- Anti-tag-cloning system (5-layer detection)
- Supply chain webhook ingestion (shipping, POS, warehouse)
- EU DPP export endpoint (ESPR-2024/1781)
- Stripe subscription checkout (3 tiers)
- SSE real-time threat streaming
- AI operations log and dashboard
- All 24 Playwright e2e tests
- Swiss Certificate design aesthetic

## Hackathons

**Build with Gemini XPRIZE** — $2,000,000 Prize Pool
- Category: Small Business Services
- AI: Gemini 2.5 Flash (threat intelligence + chain gap analysis)
- Google Cloud: Gemini API via `@google/generative-ai`

**H0: Hack the Zero Stack with Vercel v0 and AWS Databases**
- Track: B2B (Track 2) — Monetizable B2B App
- Database: Amazon DynamoDB
- Deployment: Vercel
- Team: BlockIntel Inc (Vercel Team ID: `blockintel`)

## License

Proprietary. All rights reserved.
