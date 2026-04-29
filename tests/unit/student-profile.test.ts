import { AcademicStatus, ProgramType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  assertStudentProfileAccess,
  parseRestrictedStudentProfileInput,
  StudentProfileError,
} from "@/lib/students/profile";

const baseStudent = {
  userId: "user-student-1",
  supervisorAssignments: [
    {
      supervisorUserId: "user-supervisor-1",
    },
  ],
};

describe("student profile access control", () => {
  it("allows the student to access their own profile", () => {
    expect(() =>
      assertStudentProfileAccess(
        {
          uid: "firebase-student-1",
          userId: "user-student-1",
          firebaseUid: "firebase-student-1",
          role: "STUDENT",
        },
        baseStudent,
      ),
    ).not.toThrow();
  });

  it("allows an assigned supervisor to access the profile", () => {
    expect(() =>
      assertStudentProfileAccess(
        {
          uid: "firebase-supervisor-1",
          userId: "user-supervisor-1",
          firebaseUid: "firebase-supervisor-1",
          role: "SUPERVISOR",
        },
        baseStudent,
      ),
    ).not.toThrow();
  });

  it("blocks unauthorized profile access", () => {
    expect(() =>
      assertStudentProfileAccess(
        {
          uid: "firebase-student-2",
          userId: "user-student-2",
          firebaseUid: "firebase-student-2",
          role: "STUDENT",
        },
        baseStudent,
      ),
    ).toThrowError(StudentProfileError);
  });

  it("parses a restricted admin profile update payload", () => {
    const payload = parseRestrictedStudentProfileInput({
      enrollmentDate: "2026-01-15T00:00:00.000Z",
      programType: ProgramType.PHD,
      academicStatus: AcademicStatus.UNDER_REVIEW,
    });

    expect(payload).toMatchObject({
      programType: ProgramType.PHD,
      academicStatus: AcademicStatus.UNDER_REVIEW,
    });
    expect(payload.enrollmentDate).toBeInstanceOf(Date);
  });
});
