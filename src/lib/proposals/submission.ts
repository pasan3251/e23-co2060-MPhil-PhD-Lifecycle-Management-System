import { DocumentType, ProposalStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import {
  buildProposalStoragePath,
  generateUploadSignedUrl,
  StorageAccessError,
} from "@/lib/storage";
import {
  ProposalSubmissionInput,
  ProposalUploadRequest,
  proposalSubmissionSchema,
  proposalUploadRequestSchema,
} from "@/lib/proposals/schemas";

export class ProposalSubmissionError extends Error {
  status: 400 | 403 | 404 | 409 | 413 | 500;

  constructor(message: string, status: 400 | 403 | 404 | 409 | 413 | 500 = 400) {
    super(message);
    this.name = "ProposalSubmissionError";
    this.status = status;
  }
}

export async function createProposalUploadUrl(
  input: ProposalUploadRequest,
  currentUserId: string,
  currentUserRole: UserRole,
) {
  const parsed = proposalUploadRequestSchema.safeParse(input);

  if (!parsed.success) {
    throw new ProposalSubmissionError(
      parsed.error.issues[0]?.message ?? "Invalid upload request.",
      400,
    );
  }

  if (currentUserRole !== UserRole.STUDENT && currentUserRole !== UserRole.ADMINISTRATOR) {
    throw new ProposalSubmissionError("Unauthorized", 403);
  }

  if (currentUserRole === UserRole.STUDENT) {
    const student = await prisma.student.findUnique({
      where: { userId: currentUserId },
    });
    if (!student || student.id !== parsed.data.studentId) {
      throw new ProposalSubmissionError("Unauthorized", 403);
    }
  }

  const existingProposal = await prisma.researchProposal.findFirst({
    where: { studentId: parsed.data.studentId },
  });

  if (existingProposal && existingProposal.status !== ProposalStatus.REJECTED) {
    throw new ProposalSubmissionError(
      "You can only upload a revised proposal if the current proposal is REJECTED.",
      409,
    );
  }

  const nextVersion = existingProposal ? existingProposal.currentVersion + 1 : 1;

  try {
    const storagePath = buildProposalStoragePath(
      parsed.data.studentId,
      nextVersion,
      parsed.data.fileName,
    );

    const signedUrl = await generateUploadSignedUrl(
      storagePath,
      parsed.data.contentType,
    );

    return {
      storagePath,
      signedUrl,
      version: nextVersion,
      expiresInMinutes: 15,
    };
  } catch (error) {
    if (error instanceof StorageAccessError) {
      throw new ProposalSubmissionError(error.message, error.status as any);
    }
    throw error;
  }
}

export async function submitProposal(
  input: ProposalSubmissionInput,
  currentUserId: string,
  currentUserRole: UserRole,
) {
  const parsed = proposalSubmissionSchema.safeParse(input);

  if (!parsed.success) {
    throw new ProposalSubmissionError(
      parsed.error.issues[0]?.message ?? "Invalid submission.",
      400,
    );
  }

  if (currentUserRole === UserRole.STUDENT) {
    const student = await prisma.student.findUnique({
      where: { userId: currentUserId },
    });
    if (!student || student.id !== parsed.data.studentId) {
      throw new ProposalSubmissionError("Unauthorized", 403);
    }
  }

  const existingProposal = await prisma.researchProposal.findFirst({
    where: { studentId: parsed.data.studentId },
  });

  if (existingProposal && existingProposal.status !== ProposalStatus.REJECTED) {
    throw new ProposalSubmissionError(
      "You can only upload a revised proposal if the current proposal is REJECTED.",
      409,
    );
  }

  const application = await prisma.application.findFirst({
    where: { studentId: parsed.data.studentId },
  });

  if (!application) {
    throw new ProposalSubmissionError("Application not found for student.", 404);
  }

  const nextVersion = existingProposal ? existingProposal.currentVersion + 1 : 1;

  return await prisma.$transaction(async (tx) => {
    let proposal;

    if (existingProposal) {
      proposal = await tx.researchProposal.update({
        where: { id: existingProposal.id },
        data: {
          title: parsed.data.title,
          abstract: parsed.data.abstract,
          status: ProposalStatus.SUBMITTED,
          currentVersion: nextVersion,
        },
      });

      await tx.document.updateMany({
        where: { researchProposalId: proposal.id },
        data: { isCurrentVersion: false },
      });
    } else {
      proposal = await tx.researchProposal.create({
        data: {
          studentId: parsed.data.studentId,
          applicationId: application.id,
          title: parsed.data.title,
          abstract: parsed.data.abstract,
          status: ProposalStatus.SUBMITTED,
          currentVersion: 1,
        },
      });
    }

    await tx.document.create({
      data: {
        documentType: DocumentType.PROPOSAL,
        fileName: parsed.data.fileName,
        storagePath: parsed.data.storagePath,
        mimeType: parsed.data.mimeType,
        version: nextVersion,
        isCurrentVersion: true,
        studentId: parsed.data.studentId,
        researchProposalId: proposal.id,
      },
    });

    return proposal;
  });
}

export async function updateProposalStatus(
  proposalId: string,
  nextStatus: ProposalStatus,
  currentUserRole: UserRole,
) {
  if (nextStatus === ProposalStatus.APPROVED && currentUserRole !== UserRole.ADMINISTRATOR) {
    throw new ProposalSubmissionError("Only an Administrator can approve a research proposal.", 403);
  }

  const proposal = await prisma.researchProposal.findUnique({
    where: { id: proposalId },
  });

  if (!proposal) {
    throw new ProposalSubmissionError("Proposal not found.", 404);
  }

  return prisma.researchProposal.update({
    where: { id: proposalId },
    data: { status: nextStatus },
  });
}
