import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");
    const productId = req.nextUrl.searchParams.get("productId");
    const format = req.nextUrl.searchParams.get("format") || "png";

    if (!code && !productId) {
      return NextResponse.json(
        { error: "code or productId is required" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://authentik-platform.vercel.app";
    const verifyUrl = code
      ? `${baseUrl}/verify/${code}`
      : `${baseUrl}/verify?pid=${productId}`;

    if (format === "svg") {
      const svg = await QRCode.toString(verifyUrl, {
        type: "svg",
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
      return new NextResponse(svg, {
        headers: { "Content-Type": "image/svg+xml" },
      });
    }

    const buffer = await QRCode.toBuffer(verifyUrl, {
      type: "png",
      width: 400,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("QR generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate QR code" },
      { status: 500 }
    );
  }
}
