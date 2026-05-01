import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("firebase-admin/app", () => ({
  cert: vi.fn(() => "mock-cert"),
  getApps: vi.fn(() => [{ name: "pgsms-firebase-admin" }]),
  initializeApp: vi.fn(),
}));

vi.mock("firebase-admin/auth", () => ({
  getAuth: vi.fn(),
}));

vi.mock("firebase-admin/storage", () => ({
  getStorage: vi.fn(),
}));

vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    thesis: {
      findUnique: vi.fn(),
    },
  },
}));

import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

import { GET as downloadThesis } from "@/app/api/theses/[id]/download/route";
import { prisma } from "@/lib/prisma/client";

describe("thesis download integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(prisma.user.findUnique).mockImplementation(async (args: never) => {
      const where = (args as { where: { firebaseUid?: string } }).where;

      if (where.firebaseUid === "firebase-examiner-1") {
        return {
          id: "db-examiner-1",
          firebaseUid: "firebase-examiner-1",
          email: "examiner1@example.com",
          isActive: true,
        } as never;
      }

      if (where.firebaseUid === "firebase-examiner-2") {
        return {
          id: "db-examiner-2",
          firebaseUid: "firebase-examiner-2",
          email: "examiner2@example.com",
          isActive: true,
        } as never;
      }

      return null as never;
    });

    vi.mocked(getAuth).mockReturnValue({
      verifyIdToken: vi.fn().mockImplementation(async (token: string) => {
        if (token === "EXAMINER_ASSIGNED") {
          return {
            uid: "firebase-examiner-1",
            email: "examiner1@example.com",
            role: "EXAMINER",
          };
        }

        if (token === "EXAMINER_OTHER") {
          return {
            uid: "firebase-examiner-2",
            email: "examiner2@example.com",
            role: "EXAMINER",
          };
        }

        throw new Error("Token expired");
      }),
    } as never);

    vi.mocked(getStorage).mockReturnValue({
      bucket: vi.fn(() => ({
        file: vi.fn((filePath: string) => ({
          getSignedUrl: vi.fn(async ({ action }: { action: "read" }) => {
            return [
              `https://storage.example.test/${action}?path=${encodeURIComponent(filePath)}`,
            ];
          }),
        })),
      })),
    } as never);
  });

  it("allows an assigned examiner to generate a signed thesis download URL", async () => {
    vi.mocked(prisma.thesis.findUnique).mockResolvedValue({
      id: "thesis-1",
      title: "Adaptive Systems Thesis",
      status: "UNDER_EXAMINATION",
      student: {
        id: "student-1",
        user: {
          id: "db-student-1",
          displayName: "Student One",
          email: "student@example.com",
        },
      },
      examinerAssignments: [
        {
          examinerId: "examiner-1",
          examinerUserId: "db-examiner-1",
        },
      ],
      documents: [
        {
          id: "doc-1",
          fileName: "thesis.pdf",
          storagePath: "theses/student-1/thesis.pdf",
          mimeType: "application/pdf",
          version: 1,
          isCurrentVersion: true,
          createdAt: new Date("2026-05-01T04:00:00.000Z"),
        },
      ],
    } as never);

    const response = await downloadThesis(
      new Request("http://localhost/api/theses/thesis-1/download", {
        headers: {
          authorization: "Bearer EXAMINER_ASSIGNED",
        },
      }) as never,
      {
        params: {
          id: "thesis-1",
        },
      } as never,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      document: {
        storagePath: "theses/student-1/thesis.pdf",
        isCurrentVersion: true,
      },
      expiresInMinutes: 15,
    });
  });

  it("returns 403 for a non-assigned examiner", async () => {
    vi.mocked(prisma.thesis.findUnique).mockResolvedValue({
      id: "thesis-1",
      title: "Adaptive Systems Thesis",
      status: "UNDER_EXAMINATION",
      student: {
        id: "student-1",
        user: {
          id: "db-student-1",
          displayName: "Student One",
          email: "student@example.com",
        },
      },
      examinerAssignments: [
        {
          examinerId: "examiner-1",
          examinerUserId: "db-examiner-1",
        },
      ],
      documents: [
        {
          id: "doc-1",
          fileName: "thesis.pdf",
          storagePath: "theses/student-1/thesis.pdf",
          mimeType: "application/pdf",
          version: 1,
          isCurrentVersion: true,
          createdAt: new Date("2026-05-01T04:00:00.000Z"),
        },
      ],
    } as never);

    const response = await downloadThesis(
      new Request("http://localhost/api/theses/thesis-1/download", {
        headers: {
          authorization: "Bearer EXAMINER_OTHER",
        },
      }) as never,
      {
        params: {
          id: "thesis-1",
        },
      } as never,
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: "Thesis access denied.",
    });
  });
});
