import { test, expect } from "@playwright/test";

const WATCH_CODE = "wfPHybaFV3_a";

test.describe("EU DPP Export", () => {
  test("exports DPP-compliant JSON by verification code", async ({ request }) => {
    const res = await request.get(`/api/products/dpp-export?code=${WATCH_CODE}`);
    expect(res.ok()).toBe(true);

    const contentDisposition = res.headers()["content-disposition"];
    expect(contentDisposition).toContain("dpp-");
    expect(contentDisposition).toContain(".json");

    const body = await res.json();
    expect(body["@context"]).toBe("https://schema.org/");
    expect(body.dppStandard).toBe("ESPR-2024/1781");
    expect(body.dppVersion).toBe("1.0");
    expect(body.identification).toBeDefined();
    expect(body.identification.verificationCode).toBe(WATCH_CODE);
    expect(body.verification).toBeDefined();
    expect(body.verification.algorithm).toBe("SHA-256");
    expect(body.verification.signatureAlgorithm).toBe("HMAC-SHA256");
    expect(body.supplyChain).toBeDefined();
  });

  test("rejects invalid code (404) and missing params (400)", async ({ request }) => {
    const notFound = await request.get("/api/products/dpp-export?code=INVALID_XYZ");
    expect(notFound.status()).toBe(404);
    const badReq = await request.get("/api/products/dpp-export");
    expect(badReq.status()).toBe(400);
  });
});
