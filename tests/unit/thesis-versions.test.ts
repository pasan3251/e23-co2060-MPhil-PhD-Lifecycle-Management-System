import { beforeEach, describe, expect, it } from "vitest";

import {
  assertSingleCurrentThesisDocument,
  checkAccess,
  ThesisVersionError,
} from "@/lib/theses/versions";

describe("thesis version access utilities", () => {
  beforeEach(() => {
    // no-op
  });

  it("blocks non-assigned examiners from accessing thesis downloads", () => {
    expect(() =>
      checkAccess(
        {
          uid: "firebase-examiner-2",
          userId: "user-examiner-2",
          firebaseUid: "firebase-examiner-2",
          role: "EXAMINER",
          email: "examiner2@example.com",
        },
        {
          student: {
            id: "student-1",
            user: {
              id: "user-student-1",
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
      ),
    ).toThrowError(new ThesisVersionError("Thesis access denied.", 403));
  });

  it("requires exactly one current thesis document", () => {
    expect(() =>
      assertSingleCurrentThesisDocument([
        { isCurrentVersion: true },
        { isCurrentVersion: true },
      ]),
    ).toThrow(
      "Exactly one thesis Document record must be marked as the current version.",
    );
  });
});
