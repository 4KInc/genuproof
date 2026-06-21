import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

const PRICES: Record<string, { name: string; amount: number; products: string; features: string[] }> = {
  starter: {
    name: "Starter",
    amount: 0,
    products: "10 products",
    features: ["Basic verification", "QR codes", "Provenance chain"],
  },
  brand: {
    name: "Brand",
    amount: 9900, // $99.00
    products: "500 products",
    features: [
      "Full supply chain tracking",
      "AI threat detection (Gemini)",
      "Real-time dashboard",
      "Carrier integrations",
      "Anti-tag-cloning",
    ],
  },
  business: {
    name: "Business",
    amount: 29900, // $299.00
    products: "Unlimited products",
    features: [
      "Everything in Brand",
      "API webhooks",
      "EU DPP export",
      "Team seats",
      "Priority support",
      "Custom integrations",
    ],
  },
};

export async function POST(req: NextRequest) {
  try {
    const { plan, brandId, email } = await req.json();

    if (!plan || !PRICES[plan]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (plan === "starter") {
      return NextResponse.json({ url: "/dashboard", free: true });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({
        plan: PRICES[plan],
        message: "Stripe not configured. Contact sales@authentik.com",
      });
    }

    const price = PRICES[plan];
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://authentik-platform.vercel.app";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Authentik ${price.name}`,
              description: `${price.products}. ${price.features.join(", ")}`,
            },
            unit_amount: price.amount,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${baseUrl}/dashboard?plan=${plan}&success=true`,
      cancel_url: `${baseUrl}/pricing`,
      customer_email: email || undefined,
      metadata: {
        brandId: brandId || "",
        plan,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}

// GET: Return pricing info
export async function GET() {
  return NextResponse.json({ plans: PRICES });
}
