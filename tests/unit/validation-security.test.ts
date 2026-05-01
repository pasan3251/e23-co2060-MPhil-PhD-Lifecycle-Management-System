import { describe, expect, it } from "vitest";

import {
  sanitizedEmail,
  sanitizedString,
  securePassword,
} from "@/lib/validation/schemas";

describe("validation security schemas", () => {
  it("sanitizes whitespace for common string inputs", () => {
    expect(sanitizedString.parse("  Research Proposal  ")).toBe(
      "Research Proposal",
    );
    expect(sanitizedEmail.parse("  Student@Example.COM  ")).toBe(
      "student@example.com",
    );
  });

  it("requires passwords to be at least 8 characters long", () => {
    expect(() => securePassword.parse("short")).toThrow(
      "Password must be at least 8 characters long.",
    );
    expect(securePassword.parse("  password123  ")).toBe("password123");
  });
});

