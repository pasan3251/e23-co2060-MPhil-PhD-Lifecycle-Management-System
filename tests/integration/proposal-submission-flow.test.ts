import { ProposalStatus, UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebase/admin", () => ({
  getFirebaseAdminBucket: vi.fn().mockReturnValue({
    file: vi.fn().mockReturnValue({
      getSignedUrl: vi.fn().mockResolvedValue(["https://mock-signed-url.com"]),
    }),
  }),
}));

vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    student: {
      findUnique: vi.fn(),
    },
    researchProposal: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    application: {
      findFirst: vi.fn(),
    },
    document: {
      create: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { createProposalUploadUrl, submitProposal } from "@/lib/proposals/submission";
import { prisma } from "@/lib/prisma/client";

describe("Proposal Submission Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates a signed upload URL via Firebase and records the Storage path", async () => {
    vi.mocked(prisma.student.findUnique).mockResolvedValue({
      id: "student-1",
      userId: "user-1",
    } as never);
    vi.mocked(prisma.researchProposal.findFirst).mockResolvedValue(null as never);

    const result = await createProposalUploadUrl(
      {
        studentId: "student-1",
        fileName: "my-proposal.pdf",
        contentType: "application/pdf",
        fileSizeBytes: 1024,
      },
      "user-1",
      UserRole.STUDENT
    );

    expect(result.signedUrl).toBe("https://mock-signed-url.com");
    expect(result.storagePath).toMatch(/proposals\/student-1\/1\/my-proposal\.pdf/);
    expect(result.version).toBe(1);
  });

  it("re-uploads a revised proposal only if current status is REJECTED and preserves previous versions", async () => {
    vi.mocked(prisma.student.findUnique).mockResolvedValue({
      id: "student-1",
      userId: "user-1",
    } as never);

    vi.mocked(prisma.researchProposal.findFirst).mockResolvedValue({
      id: "prop-1",
      studentId: "student-1",
      status: ProposalStatus.REJECTED,
      currentVersion: 1,
    } as never);

    vi.mocked(prisma.application.findFirst).mockResolvedValue({
      id: "app-1",
    } as never);

    vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
      return cb(prisma as never);
    });

    vi.mocked(prisma.researchProposal.update).mockResolvedValue({
      id: "prop-1",
      status: ProposalStatus.SUBMITTED,
      currentVersion: 2,
    } as never);

    await submitProposal(
      {
        studentId: "student-1",
        title: "Revised Title",
        abstract: "This is the revised abstract that is long enough.",
        fileName: "revised.pdf",
        storagePath: "proposals/student-1/2/revised.pdf",
        mimeType: "application/pdf",
        sizeBytes: 2048,
      },
      "user-1",
      UserRole.STUDENT
    );

    expect(prisma.researchProposal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prop-1" },
        data: expect.objectContaining({
          status: ProposalStatus.SUBMITTED,
          currentVersion: 2,
        }),
      })
    );

    expect(prisma.document.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { researchProposalId: "prop-1" },
        data: { isCurrentVersion: false },
      })
    );

    expect(prisma.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          version: 2,
          isCurrentVersion: true,
          researchProposalId: "prop-1",
        }),
      })
    );
  });
});
