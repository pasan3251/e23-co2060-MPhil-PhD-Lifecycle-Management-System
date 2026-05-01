import { z } from "zod";

export const sanitizedString = z.string().trim();

export const optionalSanitizedString = z.string().trim().optional();

export const sanitizedEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.");

export const securePassword = z
  .string()
  .trim()
  .min(8, "Password must be at least 8 characters long.");

export function sanitizeForLog(
  value: unknown,
  depth = 0,
): unknown {
  if (depth > 4) {
    return "[truncated]";
  }

  if (typeof value === "string") {
    if (value.includes("@")) {
      return "[redacted-email]";
    }

    if (value.length > 200) {
      return `${value.slice(0, 197)}...`;
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeForLog(entry, depth + 1));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
        const normalizedKey = key.toLowerCase();

        if (
          normalizedKey.includes("email") ||
          normalizedKey.includes("token") ||
          normalizedKey.includes("cookie") ||
          normalizedKey.includes("authorization") ||
          normalizedKey.includes("password")
        ) {
          return [key, "[redacted]"];
        }

        return [key, sanitizeForLog(entry, depth + 1)];
      }),
    );
  }

  return value;
}
