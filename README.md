# Authentik

**Anti-counterfeiting & product authentication platform.**

Cryptographic certificates that travel with your product from factory to consumer. One scan to verify. One tampered byte to detect. Built on DynamoDB for verification at any scale.

**Live:** https://authentik-platform.vercel.app

---

## What It Does

Authentik gives brands cryptographic proof of product authenticity. Every registered product receives a unique SHA-256 hash, HMAC-SHA256 signature, and verification code with QR. As products move through the supply chain, each event is cryptographically linked to the previous one in a tamper-evident hash chain. Consumers scan a QR code to instantly verify authenticity.

The platform includes real-time threat intelligence: every verification scan is analyzed for geographic anomalies, burst scanning patterns, and hash tampering.

## Architecture

```
Client Layer
  Brand Dashboard ─── Consumer Verification ─── QR Codes
         │                      │
         ▼                      ▼
Vercel (Next.js 16, Serverless Functions)
  Static Pages ─── API Routes (25 endpoints)
  Crypto Module: SHA-256, HMAC-SHA256, Merkle Trees
         │
         ▼
AWS DynamoDB (us-east-1, PAY_PER_REQUEST)
  Single-table design: PK/SK + GSI1
  6 entity types, 1 table
```

**Architecture diagram:** https://authentik-platform.vercel.app/architecture.svg

### DynamoDB Single-Table Design

| PK | SK | Purpose |
|---|---|---|
| `BRAND#id` | `PROFILE` | Brand record |
| `BRAND#id` | `STATS` | Aggregate counters |
| `BRAND#id` | `WEBHOOK#id` | Webhook configuration |
| `PRODUCT#id` | `META` | Product + hash + signature |
| `PRODUCT#id` | `EVENT#ts#type` | Provenance event (hash-chained) |
| `PRODUCT#id` | `SCAN#ts` | Verification scan log |
| `VERIFY#code` | `META` | Verification code lookup |
| `HASH#sha256` | `META` | Hash to product lookup |
| `THREAT#brandId` | `ALERT#ts` | Threat intelligence alert |
| **GSI1PK** | **GSI1SK** | |
| `BRAND#id` | `PRODUCT#ts` | Products by brand (sorted) |
| `BRAND#id` | `THREAT#ts` | Threats by brand (sorted) |

### Cryptographic Design

1. **Product Registration:** `hash = SHA-256(canonical JSON)`, `signature = HMAC-SHA256(hash, server_secret)`
2. **Provenance Chain:** `event.hash = SHA-256(event_data + previous_event.hash)` — tamper-evident linked chain
3. **Verification:** Recompute hash from stored fields, verify HMAC, walk the chain checking each link
4. **Anomaly Detection:** Geographic fraud (3+ countries/24h), burst scanning (10+ scans/hour), hash tampering

## Pages (14)

| Page | Route | Description |
|---|---|---|
| Landing | `/` | Hero, features, stats, hash ticker, certificate preview |
| Dashboard | `/dashboard` | Brand selector, product registration, supply chain events, threats, overview with activity feed |
| Verify (entry) | `/verify` | Verification code input |
| Verify (result) | `/verify/[code]` | Animated verification, certificate, provenance chain |
| QR Certificate | `/qr/[code]` | Printable branded QR certificate with product details |
| Product Detail | `/product/[id]` | Full product view, crypto identity, QR, scan history, provenance |
| Explore | `/explore` | Public product gallery with category filters |
| Compare | `/compare` | Side-by-side product verification comparison |
| Analytics | `/analytics` | Platform analytics: daily scans, hourly distribution, geo, categories |
| Status | `/status` | Live platform status with service checks and latency |
| API Docs | `/docs` | Full API reference with request/response examples |
| Embed Badge | `/embed/[code]` | Embeddable verification widget (iframe-ready) |

## API Endpoints (25)

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
| `GET` | `/api/products/certificate?code=X` | Export full cryptographic certificate (JSON) |
| `GET` | `/api/products/qr?code=X` | Generate QR code (PNG or SVG) |

### Threat Intelligence
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/threats?brandId=X` | Fetch threat alerts for a brand |
| `GET` | `/api/scans?productId=X` | Scan history with location aggregation |

### Platform
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analytics` | Aggregated platform analytics |
| `GET` | `/api/audit?limit=30` | Platform-wide audit log |
| `GET` | `/api/explore?limit=50` | Public product listing |
| `GET` | `/api/health` | Health check with DB latency |
| `GET` | `/api/og?brand=X&product=Y` | Dynamic Open Graph image (Edge) |
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
- Multi-brand support with brand selector
- Product registration (single + batch up to 50)
- Ownership transfer with chain-of-custody events
- Product recall with critical threat alerts
- Real-time brand statistics

### Supply Chain
- Provenance event types: manufactured, shipped, received, inspected, sold, transferred, recalled
- Each event hash-chained to previous (break one link, entire chain flags)
- Bulk provenance: add same event to multiple products
- Expandable event details with hash verification

### Threat Intelligence
- Geographic anomaly detection (3+ countries in 24 hours)
- Burst scan detection (10+ scans per hour)
- Hash/signature tampering detection
- Threat feed with severity levels (low/medium/high/critical)
- Webhook notifications for scans, threats, recalls

### Analytics
- Daily scan charts (7-day)
- Hourly scan distribution
- Geographic scan breakdown
- Product category breakdown
- Status breakdown (active/recalled/transferred)
- Real-time activity feed with 30s polling

### Developer Experience
- Full API documentation at `/docs`
- Embeddable verification badge (`/embed/[code]`)
- Dynamic OG images for social sharing
- Health endpoint with DB latency
- Platform-wide audit log

### Design
- Swiss Certificate aesthetic (Instrument Serif + warm paper tones)
- Dark mode with localStorage persistence
- Print-optimized QR certificates
- Mobile-responsive with hamburger nav
- Guilloche CSS patterns on certificates
- Hash ticker marquee on landing page

## Tech Stack

- **Frontend:** Next.js 16, TypeScript, Tailwind CSS
- **Database:** Amazon DynamoDB (single-table, PAY_PER_REQUEST)
- **Deployment:** Vercel (auto-deploy on git push)
- **Cryptography:** Node.js `crypto` (SHA-256, HMAC-SHA256)
- **QR:** `qrcode` (npm)
- **Fonts:** Instrument Serif (display), Geist (body), Geist Mono (code)

## Quick Start

```bash
# Clone
git clone https://github.com/4KInc/authentik-platform.git
cd authentik-platform

# Install
npm install

# Set up environment
cp .env.local.example .env.local
# Edit .env.local with your AWS credentials

# Create DynamoDB table
bash scripts/create-table.sh authentik us-east-1

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

**Verify any product:** `https://authentik-platform.vercel.app/verify/{code}`

## Hackathon

**H0: Hack the Zero Stack with Vercel v0 and AWS Databases**
- Track: B2B (Track 2) — Monetizable B2B App
- Database: Amazon DynamoDB
- Deployment: Vercel
- Team: BlockIntel Inc (Vercel Team ID: `blockintel`)

## License

Proprietary. All rights reserved.
