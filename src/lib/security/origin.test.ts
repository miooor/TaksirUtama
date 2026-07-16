import { afterEach, describe, expect, it, vi } from "vitest";
import { isTrustedMutationOrigin } from "@/lib/security/origin";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isTrustedMutationOrigin", () => {
  it("accepts matching same-origin mutations", () => {
    const request = new Request("https://app.example.test/api/settings", {
      headers: { origin: "https://app.example.test", host: "app.example.test", "sec-fetch-site": "same-origin" },
    });
    expect(isTrustedMutationOrigin(request)).toBe(true);
  });

  it("rejects cross-site and host-confusion requests", () => {
    const crossSite = new Request("https://app.example.test/api/settings", {
      headers: { origin: "https://evil.example", host: "app.example.test", "sec-fetch-site": "cross-site" },
    });
    const wrongHost = new Request("https://app.example.test/api/settings", {
      headers: { origin: "https://evil.example", host: "app.example.test", "sec-fetch-site": "same-origin" },
    });
    expect(isTrustedMutationOrigin(crossSite)).toBe(false);
    expect(isTrustedMutationOrigin(wrongHost)).toBe(false);
  });

  it("fails closed without Origin in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(isTrustedMutationOrigin(new Request("https://app.example.test/api/settings"))).toBe(false);
  });
});
