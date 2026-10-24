import { beforeEach, describe, expect, it, vi } from "vitest";

// data.ts is server-only and talks to Neon; these tests cover its pure helpers and the per-panel fault isolation.
vi.mock("server-only", () => ({}));
const { captureError } = vi.hoisted(() => ({ captureError: vi.fn(async () => ({ stored: true, isNew: true, fingerprint: "x" })) }));
vi.mock("@/lib/server/errors", () => ({ captureError, environment: () => "test" }));
vi.mock("@/lib/db/client", () => ({
  schema: {},
  db: () => {
    throw new Error("DATABASE_URL is not set");
  },
}));

const { fmtTs, internalHref, loadContacts, loadOpenErrors, parseAuthResults } = await import("./data");

describe("internalHref (feedback/contact page values are untrusted input)", () => {
  it.each([
    ["/rmd-calculator", "/rmd-calculator"],
    ["/blog/medicare/some-guide?x=1#faq", "/blog/medicare/some-guide?x=1#faq"],
    ["/", "/"],
  ])("links same-site path %s", (input, out) => {
    expect(internalHref(input)).toBe(out);
  });

  it.each(["//evil.com", "/\\evil.com", "/\t/evil.com", "https://evil.com", "javascript:alert(1)", "rmd-calculator", "", null, undefined])(
    "refuses %j",
    (input) => {
      expect(internalHref(input as string | null | undefined)).toBeNull();
    },
  );
});

describe("parseAuthResults", () => {
  it("reads the first result per mechanism, case-insensitively, in a fixed order", () => {
    const raw = "mx.cloudflare.net; dkim=pass header.d=gmail.com; DKIM=fail header.d=x.com; spf=softfail smtp.mailfrom=a@b.c; dmarc=pass (p=NONE)";
    expect(parseAuthResults(raw)).toEqual([
      { check: "SPF", result: "softfail" },
      { check: "DKIM", result: "pass" },
      { check: "DMARC", result: "pass" },
    ]);
  });

  it("returns nothing for a missing header", () => {
    expect(parseAuthResults(null)).toEqual([]);
    expect(parseAuthResults("")).toEqual([]);
  });
});

describe("fmtTs", () => {
  it("formats in UTC regardless of the server's time zone", () => {
    expect(fmtTs(new Date("2026-10-23T23:59:00Z"))).toBe("Oct 23, 2026, 23:59 UTC");
    expect(fmtTs("2026-01-01T00:05:00.000Z")).toBe("Jan 1, 2026, 00:05 UTC");
  });

  it("shows a dash for missing or unreadable values", () => {
    expect(fmtTs(null)).toBe("—");
    expect(fmtTs(undefined)).toBe("—");
    expect(fmtTs("not a date")).toBe("—");
  });
});

describe("panel loaders", () => {
  beforeEach(() => captureError.mockClear());

  it("turn a database failure into a panel-level error and log it to the error inbox", async () => {
    const [errors, contacts] = await Promise.all([loadOpenErrors(), loadContacts()]);
    expect(errors).toEqual({ ok: false, error: "DATABASE_URL is not set" });
    expect(contacts.ok).toBe(false);
    expect(captureError).toHaveBeenCalledTimes(2);
    expect(captureError).toHaveBeenCalledWith(expect.objectContaining({ source: "server", route: "/admin", message: expect.stringContaining("admin dashboard (errors)") }));
  });
});

describe("/admin/errors (the link in owner error e-mails)", () => {
  it("redirects to the dashboard's errors panel instead of 404ing", async () => {
    const { GET } = await import("../errors/route");
    const res = GET();
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("/admin#errors");
  });
});
