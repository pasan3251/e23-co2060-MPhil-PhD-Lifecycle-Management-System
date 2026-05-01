import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import { captureException } from "@sentry/nextjs";

import { createServerErrorResponse } from "@/lib/http/errors";

describe("server monitoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("captures unexpected 5xx errors without forwarding PII metadata", async () => {
    const response = await createServerErrorResponse({
      error: new Error("boom"),
      message: "Unable to save.",
      route: "/api/test",
      method: "POST",
      userId: "user-1",
      role: "ADMINISTRATOR",
      metadata: {
        email: "student@example.com",
        authorization: "Bearer secret",
        note: "kept",
      },
    });

    expect(response.status).toBe(500);
    expect(captureException).toHaveBeenCalledTimes(1);

    const scopeCallback = vi.mocked(captureException).mock.calls[0]?.[1];
    const setContext = vi.fn();
    scopeCallback?.({
      setTag: vi.fn(),
      setUser: vi.fn(),
      setContext,
      setLevel: vi.fn(),
    });

    expect(setContext).toHaveBeenCalledWith("request", {
      email: "[redacted]",
      authorization: "[redacted]",
      note: "kept",
    });
  });
});
