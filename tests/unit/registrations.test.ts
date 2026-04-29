import { describe, expect, it } from "vitest";

import { isExactlyDaysBeforeExpiration } from "@/lib/registrations";

describe("registration date utilities", () => {
  it("returns true for exactly 14 days before expiration", () => {
    const now = new Date("2026-05-01T08:00:00.000Z");
    const expirationDate = new Date("2026-05-15T23:59:59.000Z");

    expect(isExactlyDaysBeforeExpiration(expirationDate, now, 14)).toBe(true);
  });

  it("returns false for 13 days before expiration", () => {
    const now = new Date("2026-05-02T08:00:00.000Z");
    const expirationDate = new Date("2026-05-15T23:59:59.000Z");

    expect(isExactlyDaysBeforeExpiration(expirationDate, now, 14)).toBe(false);
  });

  it("returns false for a lapsed registration", () => {
    const now = new Date("2026-05-16T08:00:00.000Z");
    const expirationDate = new Date("2026-05-15T23:59:59.000Z");

    expect(isExactlyDaysBeforeExpiration(expirationDate, now, 14)).toBe(false);
  });
});
