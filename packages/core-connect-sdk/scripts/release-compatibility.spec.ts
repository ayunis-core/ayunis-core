import { describe, expect, it } from "vitest";
import { assertReleaseCompatibility } from "./release-compatibility.js";

describe("SDK release compatibility policy", () => {
  it("rejects incompatible changes within a supported minor", () => {
    expect(() => assertReleaseCompatibility("0.2.1", "0.2.0", false)).toThrow();
  });
  it("allows a compatible patch", () => {
    expect(() =>
      assertReleaseCompatibility("0.2.1", "0.2.0", true),
    ).not.toThrow();
  });
  it("requires a major release for incompatible stable APIs", () => {
    expect(() => assertReleaseCompatibility("1.1.0", "1.0.0", false)).toThrow();
    expect(() =>
      assertReleaseCompatibility("2.0.0", "1.0.0", false),
    ).not.toThrow();
  });
  it("allows an explicit pre-1.0 breaking minor", () => {
    expect(() =>
      assertReleaseCompatibility(
        "0.2.0-preview.2.1",
        "0.1.0-preview.1.1",
        false,
      ),
    ).not.toThrow();
  });
  it("rejects invalid or older release versions", () => {
    expect(() =>
      assertReleaseCompatibility("invalid", "0.2.0", true),
    ).toThrow();
    expect(() => assertReleaseCompatibility("0.1.0", "0.2.0", true)).toThrow();
  });
});
