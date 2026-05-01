import { ThesisStatus, VivaOutcome } from "@prisma/client";
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
    examiner: {
      findUnique: vi.fn(),
    },
    viva: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    thesis: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { POST } from "@/app/api/vivas/[id]/outcome/route";
import { authenticateBearerRequest } from "@/lib/firebase/auth";
import { prisma } from "@/lib/prisma/client";

describe("viva outcome integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(authenticateBearerRequest).mockResolvedValue({
      uid: "firebase-examiner-1",
      userId: "user-examiner-1",
      firebaseUid: "firebase-examiner-1",
      role: "EXAMINER",
      email: "examiner@example.com",
    } as never);
    vi.mocked(prisma.examiner.findUnique).mockResolvedValue({
      id: "examiner-1",
      userId: "user-examiner-1",
    } as never);
  });

  it("records a PASS outcome and drives the thesis toward final archive", async () => {
    vi.mocked(prisma.viva.findUnique).mockResolvedValue({
      id: "viva-1",
      thesisId: "thesis-1",
      outcome: null,
      thesis: {
        id: "thesis-1",
        title: "Adaptive Systems Thesis",
        abstract: "A thesis about adaptive systems.",
        status: ThesisStatus.UNDER_EXAMINATION,
        student: {
          id: "student-1",
          user: {
            displayName: "Student One",
            email: "student@example.com",
          },
        },
        examinerAssignments: [
          {
            examinerId: "examiner-1",
            examinerUserId: "user-examiner-1",
          },
        ],
      },
    } as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const tx = {
        viva: {
          update: vi.fn().mockResolvedValue({
            id: "viva-1",
            thesisId: "thesis-1",
            outcome: VivaOutcome.PASS,
            updatedAt: new Date("2026-05-01T13:00:00.000Z"),
          }),
        },
        thesis: {
          update: vi.fn().mockResolvedValue({
            id: "thesis-1",
            status: ThesisStatus.FINAL_ARCHIVE,
            title: "Adaptive Systems Thesis",
          }),
        },
      };

      return callback(tx as never);
    });

    const response = await POST(
      new Request("http://localhost/api/vivas/viva-1/outcome", {
        method: "POST",
        headers: {
          authorization: "Bearer examiner-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          outcome: VivaOutcome.PASS,
        }),
      }) as never,
      {
        params: {
          id: "viva-1",
        },
      } as never,
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      viva: expect.objectContaining({
        id: "viva-1",
        outcome: VivaOutcome.PASS,
      }),
      thesis: expect.objectContaining({
        id: "thesis-1",
        status: ThesisStatus.FINAL_ARCHIVE,
      }),
      nextThesisStatus: ThesisStatus.FINAL_ARCHIVE,
      requiresAdministrativeApproval: true,
    });
  });
});
