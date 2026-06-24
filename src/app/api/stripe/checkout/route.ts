import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

const PLANS: Record<string, { name: string; amount: number; products: string; features: string[]; priceId?: string }> = {
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
    priceId: process.env.STRIPE_BRAND_PRICE_ID,
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
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID,
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

    if (!plan || !PLANS[plan]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (plan === "starter") {
      return NextResponse.json({ url: "/dashboard", free: true });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({
        plan: PLANS[plan],
        message: "Stripe not configured. Contact sales@authentik.com",
      });
    }

    const planInfo = PLANS[plan];
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://authentik-platform.vercel.app";

    // Use pre-created price ID if available, otherwise create inline
    const lineItem = planInfo.priceId
      ? { price: planInfo.priceId, quantity: 1 }
      : {
          price_data: {
            currency: "usd" as const,
            product_data: {
              name: `Authentik ${planInfo.name}`,
              description: `${planInfo.products}. ${planInfo.features.join(", ")}`,
            },
            unit_amount: planInfo.amount,
            recurring: { interval: "month" as const },
          },
          quantity: 1,
        };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [lineItem],
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
  return NextResponse.json({ plans: PLANS });
}
