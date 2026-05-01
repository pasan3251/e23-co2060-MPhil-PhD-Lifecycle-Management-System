import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("firebase-admin/app", () => ({
  cert: vi.fn(() => "mock-cert"),
  getApps: vi.fn(() => [{ name: "pgsms-firebase-admin" }]),
  initializeApp: vi.fn(),
}));

vi.mock("firebase-admin/auth", () => ({
  getAuth: vi.fn(),
}));

import {
  buildSessionCookieOptions,
  verifyFirebaseToken,
} from "@/lib/firebase/admin";
import {
  SESSION_ACTIVITY_COOKIE_NAME,
  SESSION_INACTIVITY_TIMEOUT_MS,
  buildSessionActivityValue,
  hasSessionExpiredByInactivity,
} from "@/lib/security/session";
import { getAuth } from "firebase-admin/auth";

describe("verifyFirebaseToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extracts the intended role from a verified JWT", async () => {
    vi.mocked(getAuth).mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue({
        uid: "firebase-123",
        email: "student@example.com",
        role: "STUDENT",
      }),
    } as never);

    const decodedToken = await verifyFirebaseToken("mock.jwt.token");

    expect(decodedToken.uid).toBe("firebase-123");
    expect(decodedToken.role).toBe("STUDENT");
  });
});

describe("buildSessionCookieOptions", () => {
  it("returns httpOnly, secure, sameSite=lax cookie settings", () => {
    expect(buildSessionCookieOptions()).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
  });
});

describe("session inactivity helpers", () => {
  it("treats missing or stale activity cookies as expired after 30 minutes", () => {
    const now = new Date("2026-05-01T10:00:00.000Z").getTime();

    expect(hasSessionExpiredByInactivity(null, now)).toBe(true);
    expect(
      hasSessionExpiredByInactivity(
        buildSessionActivityValue(now - SESSION_INACTIVITY_TIMEOUT_MS + 1),
        now,
      ),
    ).toBe(false);
    expect(
      hasSessionExpiredByInactivity(
        buildSessionActivityValue(now - SESSION_INACTIVITY_TIMEOUT_MS - 1),
        now,
      ),
    ).toBe(true);
    expect(SESSION_ACTIVITY_COOKIE_NAME).toBe("pgsms_session_activity");
  });
});
