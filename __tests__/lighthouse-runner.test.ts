import { isTransientError } from "../src/lib/lighthouse-runner";

describe("isTransientError", () => {
  it("returns true for 'performance mark' errors", () => {
    expect(
      isTransientError(
        'The "start lh:driver:navigate" performance mark has not been set'
      )
    ).toBe(true);
    expect(
      isTransientError(
        'The "start lh:gather:getBenchmarkIndex" performance mark has not been set'
      )
    ).toBe(true);
  });

  it("returns true for connection errors", () => {
    expect(isTransientError("connect ECONNREFUSED 127.0.0.1:9222")).toBe(true);
    expect(isTransientError("read ECONNRESET")).toBe(true);
  });

  it("returns true for Chrome/protocol errors", () => {
    expect(isTransientError("Navigation timeout of 30000ms exceeded")).toBe(
      true
    );
    expect(isTransientError("Target closed")).toBe(true);
    expect(isTransientError("Session closed")).toBe(true);
    expect(isTransientError("Protocol error (Runtime.callFunctionOn)")).toBe(
      true
    );
  });

  it("returns false for non-transient errors", () => {
    expect(isTransientError("Lighthouse returned no results")).toBe(false);
    expect(isTransientError("Unknown error")).toBe(false);
    expect(isTransientError("Invalid URL")).toBe(false);
  });
});
