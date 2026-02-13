import { normalizeUrl, validateUrl, parseUrlList } from "../src/lib/url-utils";

describe("normalizeUrl", () => {
  it("adds https:// when no protocol", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com");
  });

  it("preserves http://", () => {
    expect(normalizeUrl("http://example.com")).toBe("http://example.com");
  });

  it("lowercases hostname", () => {
    expect(normalizeUrl("https://Example.COM")).toBe("https://example.com");
  });

  it("removes trailing slash", () => {
    expect(normalizeUrl("https://example.com/")).toBe("https://example.com");
  });

  it("preserves path", () => {
    expect(normalizeUrl("https://example.com/page")).toBe(
      "https://example.com/page"
    );
  });

  it("trims whitespace", () => {
    expect(normalizeUrl("  https://example.com  ")).toBe(
      "https://example.com"
    );
  });

  it("returns empty string for empty input", () => {
    expect(normalizeUrl("")).toBe("");
  });

  it("returns empty string for invalid input", () => {
    expect(normalizeUrl("not a url at all %%%")).toBe("");
  });
});

describe("validateUrl", () => {
  it("accepts valid https URL", () => {
    const result = validateUrl("https://example.com");
    expect(result.valid).toBe(true);
    expect(result.url).toBe("https://example.com");
  });

  it("accepts valid http URL", () => {
    const result = validateUrl("http://example.com");
    expect(result.valid).toBe(true);
  });

  it("normalizes URL without protocol", () => {
    const result = validateUrl("example.com");
    expect(result.valid).toBe(true);
    expect(result.url).toBe("https://example.com");
  });

  it("rejects localhost", () => {
    const result = validateUrl("http://localhost");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Internal");
  });

  it("rejects 127.0.0.1", () => {
    const result = validateUrl("http://127.0.0.1");
    expect(result.valid).toBe(false);
  });

  it("rejects private IP 10.x.x.x", () => {
    const result = validateUrl("http://10.0.0.1");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Private");
  });

  it("rejects private IP 192.168.x.x", () => {
    const result = validateUrl("http://192.168.1.1");
    expect(result.valid).toBe(false);
  });

  it("rejects private IP 172.16.x.x", () => {
    const result = validateUrl("http://172.16.0.1");
    expect(result.valid).toBe(false);
  });

  it("rejects metadata IP 169.254.169.254", () => {
    const result = validateUrl("http://169.254.169.254");
    expect(result.valid).toBe(false);
  });

  it("rejects empty input", () => {
    const result = validateUrl("");
    expect(result.valid).toBe(false);
  });

  it("rejects URL without valid domain", () => {
    const result = validateUrl("https://justahostname");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("valid domain");
  });
});

describe("parseUrlList", () => {
  it("parses multiple URLs from newlines", () => {
    const result = parseUrlList("https://example.com\nhttps://google.com");
    expect(result.valid).toHaveLength(2);
    expect(result.invalid).toHaveLength(0);
  });

  it("deduplicates URLs", () => {
    const result = parseUrlList(
      "https://example.com\nhttps://example.com\nexample.com"
    );
    expect(result.valid).toHaveLength(1);
  });

  it("separates valid and invalid URLs", () => {
    const result = parseUrlList(
      "https://example.com\nhttp://localhost\nhttps://google.com"
    );
    expect(result.valid).toHaveLength(2);
    expect(result.invalid).toHaveLength(1);
  });

  it("handles empty input", () => {
    const result = parseUrlList("");
    expect(result.valid).toHaveLength(0);
    expect(result.invalid).toHaveLength(0);
  });

  it("handles comma-separated URLs", () => {
    const result = parseUrlList("https://example.com,https://google.com");
    expect(result.valid).toHaveLength(2);
  });

  it("skips blank lines", () => {
    const result = parseUrlList("https://example.com\n\n\nhttps://google.com");
    expect(result.valid).toHaveLength(2);
  });
});
