import { NextRequest, NextResponse } from "next/server";
import { queryItems } from "@/lib/dynamodb";

// Audit log — queries AUDIT_LOG collection key instead of table Scan
// Every write operation also writes to AUDIT_LOG / timestamp#type for O(1) retrieval

export async function GET(req: NextRequest) {
  try {
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "30");

    // Query the audit log collection — avoids table Scan
    let items = await queryItems("AUDIT_LOG", undefined, {
      limit: limit * 2,
      scanForward: false,
    });

    // Fallback: query recent events from known products via PRODUCT_INDEX
    if (items.length === 0) {
      const products = await queryItems("PRODUCT_INDEX", "PRODUCT#", {
        limit: 10,
        scanForward: false,
      });

      const eventResults = await Promise.all(
        products.map((p) =>
          queryItems(`PRODUCT#${p.productId}`, "EVENT#", {
            limit: 5,
            scanForward: false,
          })
        )
      );

      const scanResults = await Promise.all(
        products.map((p) =>
          queryItems(`PRODUCT#${p.productId}`, "SCAN#", {
            limit: 5,
            scanForward: false,
          })
        )
      );

      items = [...eventResults.flat(), ...scanResults.flat()];
    }

    const entries = items
      .map((item) => {
        const sk = (item.SK as string) || "";
        if (sk.startsWith("EVENT#")) {
          return {
            type: "event" as const,
            action: item.type as string,
            actor: item.actor as string,
            productId: item.productId as string,
            location: item.location as string | null,
            timestamp: item.timestamp as string,
            hash: ((item.hash as string) || "").slice(0, 12),
          };
        } else if (sk.startsWith("SCAN#")) {
          return {
            type: "scan" as const,
            action: "verification_scan",
            actor: null,
            productId: item.productId as string,
            location: item.city && item.country ? `${item.city}, ${item.country}` : null,
            timestamp: item.timestamp as string,
            hash: null,
            result: item.result as string,
          };
        } else {
          return {
            type: "alert" as const,
            action: (item.type as string) || "unknown",
            actor: null,
            productId: (item.productId as string) || null,
            location: null,
            timestamp: item.timestamp as string,
            hash: null,
            severity: item.severity as string,
            details: item.details as string,
          };
        }
      })
      .filter((e) => e.timestamp)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, limit);

    return NextResponse.json({ entries, count: entries.length });
  } catch (error) {
    console.error("Audit log error:", error);
    return NextResponse.json({ error: "Failed to load audit log" }, { status: 500 });
  }
}
