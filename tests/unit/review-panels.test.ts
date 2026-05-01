import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/review-panels/workflow", () => ({
  forwardSignedOffProgressReportToPanel: vi.fn().mockResolvedValue({
    forwardedToPanel: false,
    notifiedPanelMembers: 0,
    reviewPanelId: null,
  }),
}));

vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    supervisor: {
      findUnique: vi.fn(),
    },
    panelEvaluation: {
      findFirst: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    student: {
      update: vi.fn(),
    },
  },
}));

import {
  hasTwoConsecutiveFailingEvaluations,
  ReviewPanelError,
  submitPanelEvaluation,
} from "@/lib/review-panels";
import { prisma } from "@/lib/prisma/client";

describe("review panel workflow rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(prisma.supervisor.findUnique).mockResolvedValue({
      id: "supervisor-1",
      user: {
        displayName: "Dr. Panel",
      },
    } as never);
  });

  it("detects two consecutive panel evaluations below the failing threshold", () => {
    expect(
      hasTwoConsecutiveFailingEvaluations([
        { score: 72 },
        { score: 41 },
        { score: 38 },
      ]),
    ).toBe(true);

    expect(
      hasTwoConsecutiveFailingEvaluations([
        { score: 45 },
        { score: 67 },
      ]),
    ).toBe(false);
  });

  it("blocks panel evaluation submission when the report is not signed off", async () => {
    vi.mocked(prisma.panelEvaluation.findFirst).mockResolvedValue({
      id: "evaluation-1",
      reviewPanelId: "panel-1",
      progressReportId: "report-1",
      score: null,
      progressReport: {
        id: "report-1",
        isSupervisorSignedOff: false,
        studentId: "student-1",
      },
    } as never);

    await expect(
      submitPanelEvaluation(
        {
          progressReportId: "report-1",
          numericalScore: 42,
          outcome: "FAIL",
          notes: "Serious concerns remain.",
        },
        {
          uid: "firebase-supervisor-1",
          userId: "user-supervisor-1",
          firebaseUid: "firebase-supervisor-1",
          role: "SUPERVISOR",
          email: "panel@example.com",
        },
      ),
    ).rejects.toMatchObject<ReviewPanelError>({
      status: 409,
      message: "Panel evaluations are only allowed after supervisor sign-off.",
    });
  });
});
