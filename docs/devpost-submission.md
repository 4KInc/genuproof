# Authentik — Anti-Counterfeiting & Product Authentication Platform

## What it does

Authentik is a full-stack B2B platform that gives brands cryptographic proof of product authenticity. Every product registered on Authentik receives a unique SHA-256 hash, HMAC-SHA256 signature, and a verification code (with QR). As products move through the supply chain, each event is cryptographically linked to the previous one in a tamper-evident hash chain. Consumers scan a QR code to instantly verify authenticity, see the full provenance chain, and get a digital certificate of authenticity.

The platform includes real-time threat intelligence: every verification scan is analyzed for geographic anomalies (same product scanned from multiple countries), burst scanning patterns (counterfeiters testing codes), and hash tampering. Alerts are surfaced on the brand dashboard.

**Key capabilities:**
- Product registration with SHA-256 hash + HMAC-SHA256 signature
- Hash-chained provenance tracking (manufactured → shipped → inspected → sold)
- Consumer-facing verification with animated cryptographic checks
- QR code generation (PNG/SVG)
- Ownership transfer with chain-of-custody events
- Batch product registration (up to 50/request)
- Real-time anomaly detection (geographic fraud, burst scanning)
- Brand dashboard with threat intelligence feed
- Full REST API with 9 endpoints

## How we built it

**Frontend:** Next.js 16 with TypeScript and Tailwind CSS, deployed on Vercel. The design uses an editorial "Swiss Certificate" aesthetic with Instrument Serif typography, warm paper tones, and guilloche-inspired CSS patterns that evoke official documents — a deliberate departure from generic AI-generated UIs.

**Backend:** Next.js API routes (serverless functions on Vercel) handle all business logic. The crypto module uses Node.js built-in `crypto` for SHA-256 hashing, HMAC-SHA256 signing, and Merkle tree construction.

**Database:** Amazon DynamoDB with a single-table design. One table (`authentik`) handles brands, products, provenance events, verification scans, and threat alerts using composite primary keys (PK/SK) and a Global Secondary Index (GSI1). This design gives us:
- Sub-10ms verification lookups via direct key access
- Append-only provenance chains (natural fit for DynamoDB's key-value model)
- Atomic scan counters for analytics
- TTL for temporary share links
- PAY_PER_REQUEST billing (scales to zero, no idle costs)

**DynamoDB Access Patterns:**
| PK | SK | Purpose |
|---|---|---|
| BRAND#id | PROFILE | Brand record |
| PRODUCT#id | META | Product + hash + signature |
| PRODUCT#id | EVENT#ts#type | Provenance event (hash-chained) |
| PRODUCT#id | SCAN#ts | Verification scan log |
| VERIFY#code | META | Verification code lookup |
| THREAT#brandId | ALERT#ts | Threat alert |
| GSI1: BRAND#id | PRODUCT#ts | Products by brand (sorted) |

**Cryptographic Design:**
1. Product registration: `hash = SHA-256(canonical JSON)`, `signature = HMAC-SHA256(hash, server_secret)`
2. Provenance chain: `event.hash = SHA-256(event_data + previous_event.hash)`, creating a tamper-evident linked chain
3. Verification: recompute hash from stored fields, verify HMAC, walk the provenance chain checking each link

## Challenges we ran into

**Single-table DynamoDB design:** Modeling 6 different entity types (brands, products, events, scans, codes, threats) in one table required careful PK/SK pattern design. The key insight was using composite sort keys (e.g., `EVENT#timestamp#type`) to enable both time-ordered queries and type filtering on the same partition.

**Cryptographic chain integrity on concurrent writes:** When multiple supply chain events arrive for the same product simultaneously, each needs the previous event's hash. We solved this by querying the latest event (sort descending, limit 1) immediately before writing, accepting that in a production system this would need conditional writes or a queue.

**Verification page UX:** Showing cryptographic details (SHA-256 hashes, HMAC signatures, chain integrity) to consumers without overwhelming them. We designed a progressive disclosure pattern: the certificate shows "Authentic" at a glance, with expandable sections for crypto details and the full provenance chain.

## What we learned

1. **DynamoDB's single-table design is powerful but requires upfront thinking.** The access patterns must be defined before the schema. Once designed, queries are blazingly fast — our verification lookups average <10ms.

2. **Hash chains are simple but effective.** The same concept that makes blockchains tamper-evident works at the application level. If any event in the chain is modified, every subsequent hash changes — detection is immediate and automatic.

3. **Light mode + serif fonts = instant design differentiation.** In a sea of dark-mode purple-gradient hackathon projects, choosing a warm editorial aesthetic with Instrument Serif made the project visually memorable.

4. **Vercel + DynamoDB is a natural pairing.** Serverless functions with a serverless database means zero infrastructure management, instant scaling, and deployment in seconds via git push.

## What's next

- **Blockchain anchoring:** Batch Merkle roots of product certificates to Base L2 for decentralized verification even if Authentik goes offline
- **E-commerce integrations:** Shopify/WooCommerce plugins for automatic product registration at SKU creation
- **Mobile SDK:** Native QR scanning with NFC tag support for luxury goods
- **Advanced threat intelligence:** Machine learning on scan patterns to predict counterfeit hotspots before they emerge
- **EU Digital Product Passport compliance:** The EU mandates digital product passports by 2027 — Authentik's provenance chain is architecturally ready

## Built With

- Next.js 16
- TypeScript
- Tailwind CSS
- Amazon DynamoDB
- Vercel
- Node.js Crypto (SHA-256, HMAC-SHA256)
- QRCode (npm)

## Links

- **Live app:** https://authentik-platform.vercel.app
- **Verify a product:** https://authentik-platform.vercel.app/verify/wfPHybaFV3_a
- **API docs:** https://authentik-platform.vercel.app/docs
- **Architecture diagram:** https://authentik-platform.vercel.app/architecture.svg
- **Dashboard:** https://authentik-platform.vercel.app/dashboard
