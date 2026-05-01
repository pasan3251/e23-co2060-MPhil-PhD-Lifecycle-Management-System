import { ProposalStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/email", () => ({
  notifyProposalStatusChange: vi.fn().mockResolvedValue({
    success: true,
  }),
}));

vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    researchProposal: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    student: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import {
  ProposalSubmissionError,
  proposalSubmissionSchema,
  updateResearchProposalStatus,
} from "@/lib/proposals/submission";
import { prisma } from "@/lib/prisma/client";

describe("proposal submission utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a non-PDF proposal document via the Zod schema", () => {
    const result = proposalSubmissionSchema.safeParse({
      title: "Adaptive Thesis Supervision",
      abstract:
        "This proposal studies decision-support patterns for postgraduate supervision workflows.",
      document: {
        fileName: "proposal.docx",
        storagePath: "proposals/student-1/1/proposal.docx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        sizeBytes: 2048,
      },
    });

    expect(result.success).toBe(false);
  });

  it("allows only an Administrator to transition a proposal to APPROVED", async () => {
    await expect(
      updateResearchProposalStatus(
        "proposal-1",
        {
          status: ProposalStatus.APPROVED,
        },
        {
          uid: "firebase-student-1",
          userId: "user-student-1",
          firebaseUid: "firebase-student-1",
          role: "STUDENT",
          email: "student@example.com",
        },
      ),
    ).rejects.toMatchObject<ProposalSubmissionError>({
      status: 403,
      message: "Only administrators can update proposal status.",
    });

    expect(prisma.researchProposal.findUnique).not.toHaveBeenCalled();
  });
});
