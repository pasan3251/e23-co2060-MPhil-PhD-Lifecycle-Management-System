import { AcademicStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    administrator: {
      findUnique: vi.fn(),
    },
    student: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { archiveStudentRecord, ArchiveError } from "@/lib/admin/archive";
import { prisma } from "@/lib/prisma/client";
import { getStudentProfileById } from "@/lib/students/profile";

describe("student archive and visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("only allows administrators to archive a student record", async () => {
    await expect(
      archiveStudentRecord("student-1", {
        uid: "firebase-supervisor-1",
        userId: "user-supervisor-1",
        firebaseUid: "firebase-supervisor-1",
        role: "SUPERVISOR",
      }),
    ).rejects.toBeInstanceOf(ArchiveError);
  });

  it("hides archived student profiles from non-admin workflows", async () => {
    vi.mocked(prisma.student.findUnique).mockResolvedValue({
      id: "student-1",
      userId: "user-student-1",
      programType: "MPHIL",
      academicStatus: AcademicStatus.ARCHIVED,
      isArchived: true,
      enrollmentDate: new Date("2025-01-01T00:00:00.000Z"),
      updatedBy: "user-admin-1",
      updatedAt: new Date("2026-05-01T00:00:00.000Z"),
      user: {
        id: "user-student-1",
        email: "student@example.com",
        displayName: "Student One",
        role: "STUDENT",
        isActive: true,
      },
      supervisorAssignments: [],
    } as never);

    await expect(
      getStudentProfileById("student-1", {
        uid: "firebase-student-1",
        userId: "user-student-1",
        firebaseUid: "firebase-student-1",
        role: "STUDENT",
      }),
    ).rejects.toMatchObject({
      status: 404,
    });
  });
});
