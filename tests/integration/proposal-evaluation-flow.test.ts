import { ProposalStatus, UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/email", () => ({
  notifyProposalEvaluationSubmitted: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    supervisor: {
      findUnique: vi.fn(),
    },
    researchProposal: {
      findUnique: vi.fn(),
    },
    supervisorAssignment: {
      findUnique: vi.fn(),
    },
    evaluationForm: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    administrator: {
      findMany: vi.fn(),
    },
  },
}));

import { submitEvaluation } from "@/lib/proposals/evaluations";
import { ProposalSubmissionError } from "@/lib/proposals/submission";
import { prisma } from "@/lib/prisma/client";
import { notifyProposalEvaluationSubmitted } from "@/lib/email";

describe("Proposal Evaluation Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects evaluation if supervisor is not assigned to student (REQ-SEC-004)", async () => {
    vi.mocked(prisma.supervisor.findUnique).mockResolvedValue({
      id: "sup-1",
      userId: "user-sup",
      user: { displayName: "Dr. Smith" }
    } as never);

    vi.mocked(prisma.researchProposal.findUnique).mockResolvedValue({
      id: "prop-1",
      studentId: "stud-1",
      status: ProposalStatus.UNDER_REVIEW,
      student: { user: { displayName: "Student A" } }
    } as never);

    vi.mocked(prisma.supervisorAssignment.findUnique).mockResolvedValue(null as never);

    await expect(
      submitEvaluation("prop-1", { score: 90, feedback: "A".repeat(50) }, "user-sup")
    ).rejects.toThrowError(ProposalSubmissionError);
    
    await expect(
      submitEvaluation("prop-1", { score: 90, feedback: "A".repeat(50) }, "user-sup")
    ).rejects.toThrow("You are not assigned to supervise this student.");
  });

  it("submits evaluation and notifies administrator", async () => {
    vi.mocked(prisma.supervisor.findUnique).mockResolvedValue({
      id: "sup-1",
      userId: "user-sup",
      user: { displayName: "Dr. Smith" }
    } as never);

    vi.mocked(prisma.researchProposal.findUnique).mockResolvedValue({
      id: "prop-1",
      title: "My Proposal",
      studentId: "stud-1",
      status: ProposalStatus.UNDER_REVIEW,
      student: { user: { displayName: "Student A" } }
    } as never);

    vi.mocked(prisma.supervisorAssignment.findUnique).mockResolvedValue({
      id: "assignment-1",
    } as never);

    vi.mocked(prisma.evaluationForm.findUnique).mockResolvedValue(null as never);

    vi.mocked(prisma.evaluationForm.create).mockResolvedValue({
      id: "eval-1",
      score: 85,
    } as never);

    vi.mocked(prisma.administrator.findMany).mockResolvedValue([
      { user: { id: "admin-1", email: "admin@example.com", displayName: "Admin User" } }
    ] as never);

    await submitEvaluation("prop-1", { score: 85, feedback: "A".repeat(50) }, "user-sup");

    expect(prisma.evaluationForm.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ score: 85 })
      })
    );

    expect(notifyProposalEvaluationSubmitted).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: "admin-1",
        supervisorName: "Dr. Smith",
        studentName: "Student A",
        proposalTitle: "My Proposal",
      })
    );
  });
});
