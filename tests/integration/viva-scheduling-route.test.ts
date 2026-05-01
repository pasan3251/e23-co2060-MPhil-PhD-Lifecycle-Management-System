import { ThesisStatus, UserRole } from "@prisma/client";
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

vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    thesis: {
      findUnique: vi.fn(),
    },
    viva: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/email", () => ({
  notifyVivaScheduled: vi.fn(),
}));

import { POST } from "@/app/api/vivas/route";
import { notifyVivaScheduled } from "@/lib/email";
import { authenticateBearerRequest } from "@/lib/firebase/auth";
import { prisma } from "@/lib/prisma/client";

describe("viva scheduling integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(authenticateBearerRequest).mockResolvedValue({
      uid: "firebase-admin-1",
      userId: "user-admin-1",
      firebaseUid: "firebase-admin-1",
      role: UserRole.ADMINISTRATOR,
      email: "admin@example.com",
    } as never);
  });

  it("schedules a viva and triggers email notifications", async () => {
    vi.mocked(prisma.thesis.findUnique).mockResolvedValue({
      id: "thesis-1",
      title: "Some Title",
      status: ThesisStatus.UNDER_EXAMINATION,
      student: {
        userId: "student-1",
        user: { email: "student@example.com", displayName: "Student One" },
      },
      examinerAssignments: [
        {
          examiner: {
            userId: "examiner-1",
            user: { email: "examiner@example.com", displayName: "Examiner One" },
          },
        },
      ],
    } as never);

    vi.mocked(prisma.viva.upsert).mockResolvedValue({
      id: "viva-1",
      thesisId: "thesis-1",
      venue: "Main Hall",
      scheduledDate: new Date("2026-10-10T10:00:00.000Z"),
    } as never);

    const validDateInFuture = new Date();
    validDateInFuture.setDate(validDateInFuture.getDate() + 10);

    const response = await POST(
      new Request("http://localhost/api/vivas", {
        method: "POST",
        headers: {
          authorization: "Bearer admin-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          thesisId: "thesis-1",
          venue: "Main Hall",
          scheduledDate: validDateInFuture.toISOString(),
        }),
      }) as never,
      {} as never,
    );

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.id).toBe("viva-1");
    expect(data.venue).toBe("Main Hall");

    expect(prisma.viva.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { thesisId: "thesis-1" },
        create: expect.objectContaining({ venue: "Main Hall" }),
      }),
    );

    expect(notifyVivaScheduled).toHaveBeenCalledTimes(2);
    expect(notifyVivaScheduled).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "student@example.com",
        venue: "Main Hall",
      }),
    );
    expect(notifyVivaScheduled).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "examiner@example.com",
        venue: "Main Hall",
      }),
    );
  });
});
