import { beforeEach, describe, expect, it } from "vitest";

import {
  assertSingleCurrentProposalVersion,
  checkAccess,
  ProposalVersionError,
} from "@/lib/proposals/versions";

describe("proposal version access utilities", () => {
  beforeEach(() => {
    // no-op, keeps test structure consistent with the rest of the suite
  });

  it("blocks examiners from accessing research proposals", () => {
    expect(() =>
      checkAccess(
        {
          uid: "firebase-examiner-1",
          userId: "user-examiner-1",
          firebaseUid: "firebase-examiner-1",
          role: "EXAMINER",
          email: "examiner@example.com",
        },
        {
          student: {
            id: "student-1",
            user: {
              id: "user-student-1",
              displayName: "Student One",
              email: "student@example.com",
            },
            supervisorAssignments: [],
          },
        },
      ),
    ).toThrowError(
      new ProposalVersionError(
        "Examiners are not allowed to access research proposals.",
        403,
      ),
    );
  });

  it("requires exactly one current proposal document version", () => {
    expect(() =>
      assertSingleCurrentProposalVersion([
        { isCurrentVersion: true },
        { isCurrentVersion: true },
      ]),
    ).toThrow(
      "Exactly one Document record per proposal must be marked as the current version.",
    );
  });
});
