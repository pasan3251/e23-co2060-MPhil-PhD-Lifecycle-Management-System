import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebase/auth", () => ({
  authenticateBearerRequest: vi.fn(),
  AuthError: class AuthError extends Error {
    status: 401 | 403;

    constructor(message: string, status: 401 | 403) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("@/lib/supervisor/students", () => ({
  SupervisorStudentsError: class SupervisorStudentsError extends Error {
    status: number;

    constructor(message: string, status = 400) {
      super(message);
      this.status = status;
    }
  },
  parseSupervisorStudentFilters: vi.fn().mockReturnValue({}),
  getSupervisorAssignedStudents: vi.fn(),
}));

import { GET } from "@/app/api/supervisor/students/route";
import { authenticateBearerRequest, AuthError } from "@/lib/firebase/auth";

describe("supervisor students route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when a student attempts to access the supervisor students route", async () => {
    vi.mocked(authenticateBearerRequest).mockRejectedValue(
      new AuthError("Forbidden.", 403),
    );

    const response = await GET(
      new Request("http://localhost/api/supervisor/students", {
        headers: {
          authorization: "Bearer student-token",
        },
      }) as never,
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "Forbidden.",
    });
  });

  it("returns 403 when an examiner attempts to access the supervisor students route", async () => {
    vi.mocked(authenticateBearerRequest).mockRejectedValue(
      new AuthError("Forbidden.", 403),
    );

    const response = await GET(
      new Request("http://localhost/api/supervisor/students", {
        headers: {
          authorization: "Bearer examiner-token",
        },
      }) as never,
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "Forbidden.",
    });
  });
});
