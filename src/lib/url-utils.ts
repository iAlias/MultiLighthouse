/**
 * URL validation and sanitization utilities.
 * Provides SSRF protection by blocking internal/private IPs and localhost.
 */

const BLOCKED_HOSTNAMES = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "[::1]",
  "metadata.google.internal",
  "169.254.169.254",
];

const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,
  /^fc00:/i,
  /^fe80:/i,
];

/**
 * Normalizes a URL string:
 * - Trims whitespace
 * - Adds https:// if no protocol
 * - Lowercases protocol and host
 * - Removes trailing slash
 */
export function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!url) return "";

  // Add protocol if missing
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }

  try {
    const parsed = new URL(url);
    // Lowercase protocol and hostname
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();

    let result = parsed.toString();
    // Remove trailing slash if it's just the root
    if (result.endsWith("/") && parsed.pathname === "/") {
      result = result.slice(0, -1);
    }
    return result;
  } catch {
    return "";
  }
}

/**
 * Validates a URL for Lighthouse analysis.
 * Returns { valid: true, url } or { valid: false, error }.
 */
export function validateUrl(input: string): {
  valid: boolean;
  url?: string;
  error?: string;
} {
  const normalized = normalizeUrl(input);
  if (!normalized) {
    return { valid: false, error: "Invalid URL format" };
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  // Only allow http and https
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { valid: false, error: "Only HTTP and HTTPS URLs are allowed" };
  }

  // Block internal hostnames
  if (BLOCKED_HOSTNAMES.includes(parsed.hostname.toLowerCase())) {
    return { valid: false, error: "Internal/localhost URLs are not allowed" };
  }

  // Block private IP ranges
  for (const range of PRIVATE_IP_RANGES) {
    if (range.test(parsed.hostname)) {
      return { valid: false, error: "Private IP addresses are not allowed" };
    }
  }

  // Must have a valid hostname with at least one dot (domain)
  if (
    !parsed.hostname.includes(".") &&
    !BLOCKED_HOSTNAMES.includes(parsed.hostname)
  ) {
    return { valid: false, error: "URL must have a valid domain" };
  }

  return { valid: true, url: normalized };
}

/**
 * Parses a textarea input into validated, deduplicated URLs.
 */
export function parseUrlList(input: string): {
  valid: { url: string }[];
  invalid: { input: string; error: string }[];
} {
  const lines = input
    .split(/[\n,]/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const seen = new Set<string>();
  const valid: { url: string }[] = [];
  const invalid: { input: string; error: string }[] = [];

  for (const line of lines) {
    const result = validateUrl(line);
    if (result.valid && result.url) {
      if (!seen.has(result.url)) {
        seen.add(result.url);
        valid.push({ url: result.url });
      }
    } else {
      invalid.push({ input: line, error: result.error || "Invalid URL" });
    }
  }

  return { valid, invalid };
}
