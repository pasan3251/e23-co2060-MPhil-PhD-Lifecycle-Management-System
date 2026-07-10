import {
  DocumentType,
  ProposalStatus,
  RegistrationStatus,
  UserRole,
  type Prisma,
} from "@prisma/client";

import { notify } from "@/lib/notifications";
import { prisma } from "@/lib/prisma/client";
import {
  assertFileUploadConstraints,
  buildEthicsApprovalStoragePath,
  generateUploadSignedUrl,
  normalizeStoragePath,
  StorageAccessError,
} from "@/lib/storage";
import type { AuthenticatedUserContext } from "@/types/auth";

import {
  ethicsApprovalSubmissionSchema,
  ethicsApprovalUploadRequestSchema,
  type EthicsApprovalSubmissionInput,
  type EthicsApprovalUploadRequest,
} from "@/lib/ethics/schemas";

export {
  ethicsApprovalSubmissionSchema,
  ethicsApprovalUploadRequestSchema,
};

export class EthicsApprovalError extends Error {
  status: 400 | 403 | 404 | 409 | 410 | 413 | 500;

  constructor(
    message: string,
    status: 400 | 403 | 404 | 409 | 410 | 413 | 500 = 400,
  ) {
    super(message);
    this.name = "EthicsApprovalError";
    this.status = status;
  }
}

const ethicsApprovalSelect = {
  id: true,
  studentId: true,
  title: true,
  summary: true,
  isArchived: true,
  createdAt: true,
  updatedAt: true,
  documents: {
    where: {
      isDeleted: false,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      fileName: true,
      storagePath: true,
      mimeType: true,
      version: true,
      isCurrentVersion: true,
      createdAt: true,
    },
  },
  student: {
    select: {
      id: true,
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
      programType: true,
    },
  },
} satisfies Prisma.EthicsApprovalSelect;

type EthicsApprovalRecord = Prisma.EthicsApprovalGetPayload<{
  select: typeof ethicsApprovalSelect;
}>;

type StudentEthicsContext = {
  id: string;
  user: {
    id: string;
    displayName: string;
    email: string;
  };
  hasActiveRegistration: boolean;
  hasApprovedProposal: boolean;
  approvals: EthicsApprovalRecord[];
};

function mapEthicsApproval(record: EthicsApprovalRecord) {
  return {
    id: record.id,
    studentId: record.studentId,
    title: record.title,
    summary: record.summary,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    student: {
      id: record.student.id,
      displayName: record.student.user.displayName,
      email: record.student.user.email,
      programType: record.student.programType,
    },
    documents: record.documents.map((document) => ({
      id: document.id,
      fileName: document.fileName,
      storagePath: document.storagePath,
      mimeType: document.mimeType,
      version: document.version,
      isCurrentVersion: document.isCurrentVersion,
      createdAt: document.createdAt,
    })),
  };
}

function assertEthicsDocumentUpload(input: {
  contentType: string;
  fileSizeBytes: number;
  path: string;
}) {
  try {
    assertFileUploadConstraints(input);
  } catch (error) {
    if (error instanceof StorageAccessError) {
      throw new EthicsApprovalError(error.message, error.status);
    }

    throw error;
  }

  const normalizedPath = normalizeStoragePath(input.path);

  if (!normalizedPath.startsWith("ethics-approvals/")) {
    throw new EthicsApprovalError(
      "Ethics documents must be uploaded to the ethics-approvals directory.",
      400,
    );
  }
}

async function findStudentEthicsContext(
  auth: AuthenticatedUserContext,
): Promise<StudentEthicsContext | null> {
  return prisma.student.findUnique({
    where: {
      userId: auth.userId,
    },
    select: {
      id: true,
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
      registrations: {
        where: {
          status: RegistrationStatus.ACTIVE,
          expirationDate: {
            gte: new Date(),
          },
        },
        select: {
          id: true,
        },
        take: 1,
      },
      researchProposals: {
        where: {
          status: ProposalStatus.APPROVED,
          isArchived: false,
        },
        select: {
          id: true,
        },
        take: 1,
      },
      ethicsApprovals: {
        where: {
          isArchived: false,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: ethicsApprovalSelect,
      },
    },
  }).then((student) => {
    if (!student) {
      return null;
    }

    return {
      id: student.id,
      user: student.user,
      hasActiveRegistration: student.registrations.length > 0,
      hasApprovedProposal: student.researchProposals.length > 0,
      approvals: student.ethicsApprovals,
    };
  });
}

function getEthicsSubmissionBlockedReason(student: StudentEthicsContext) {
  if (!student.hasActiveRegistration) {
    return "An active registration is required before submitting ethics documents.";
  }

  if (!student.hasApprovedProposal) {
    return "Your proposal must be approved before submitting ethics documents.";
  }

  if (student.approvals.length > 0) {
    return "Ethics documents have already been submitted for this student.";
  }

  return null;
}

async function requireStudentEthicsContext(auth: AuthenticatedUserContext) {
  if (auth.role !== UserRole.STUDENT) {
    throw new EthicsApprovalError("Only students can submit ethics documents.", 403);
  }

  const student = await findStudentEthicsContext(auth);

  if (!student) {
    throw new EthicsApprovalError("Student profile not found.", 404);
  }

  return student;
}

function resolveApprovalIdFromStoragePath(studentId: string, storagePath: string) {
  const normalizedPath = normalizeStoragePath(storagePath);
  const [root, ownerId, approvalId] = normalizedPath.split("/");

  if (root !== "ethics-approvals" || ownerId !== studentId || !approvalId) {
    throw new EthicsApprovalError(
      "The uploaded ethics document does not match the expected storage path.",
      409,
    );
  }

  return approvalId;
}

async function notifyAdministratorsOfEthicsSubmission(input: {
  studentId: string;
  studentName: string;
  documentTitle: string;
}) {
  const administrators = await prisma.user.findMany({
    where: {
      role: UserRole.ADMINISTRATOR,
      isActive: true,
    },
    select: {
      id: true,
      displayName: true,
      email: true,
    },
  });

  await Promise.all(
    administrators
      .filter((administrator) => administrator.email)
      .map((administrator) =>
        notify({
          event: "ETHICS_APPROVAL_SUBMITTED",
          recipientUserId: administrator.id,
          to: administrator.email,
          administratorName: administrator.displayName,
          studentName: input.studentName,
          studentId: input.studentId,
          applicationTitle: input.documentTitle,
        }),
      ),
  );
}

export async function createEthicsApprovalUploadUrl(
  input: EthicsApprovalUploadRequest,
  auth: AuthenticatedUserContext,
) {
  const parsed = ethicsApprovalUploadRequestSchema.safeParse(input);

  if (!parsed.success) {
    throw new EthicsApprovalError(
      parsed.error.issues[0]?.message ?? "Invalid ethics upload request.",
      400,
    );
  }

  const student = await requireStudentEthicsContext(auth);
  const blockedReason = getEthicsSubmissionBlockedReason(student);

  if (blockedReason) {
    throw new EthicsApprovalError(blockedReason, 409);
  }

  const approvalId = parsed.data.approvalId ?? crypto.randomUUID();
  const storagePath = buildEthicsApprovalStoragePath(
    student.id,
    approvalId,
    parsed.data.fileName,
  );

  assertEthicsDocumentUpload({
    contentType: parsed.data.contentType,
    fileSizeBytes: parsed.data.fileSizeBytes,
    path: storagePath,
  });

  const signedUrl = await generateUploadSignedUrl(
    storagePath,
    parsed.data.contentType,
  );

  return {
    approvalId,
    signedUrl,
    storagePath,
    expiresInMinutes: 15,
  };
}

export async function submitEthicsApproval(
  input: EthicsApprovalSubmissionInput,
  auth: AuthenticatedUserContext,
) {
  const parsed = ethicsApprovalSubmissionSchema.safeParse(input);

  if (!parsed.success) {
    throw new EthicsApprovalError(
      parsed.error.issues[0]?.message ?? "Invalid ethics document submission.",
      400,
    );
  }

  const student = await requireStudentEthicsContext(auth);
  const blockedReason = getEthicsSubmissionBlockedReason(student);

  if (blockedReason) {
    throw new EthicsApprovalError(blockedReason, 409);
  }

  const approvalId = resolveApprovalIdFromStoragePath(
    student.id,
    parsed.data.documents[0].storagePath,
  );

  for (const document of parsed.data.documents) {
    const documentApprovalId = resolveApprovalIdFromStoragePath(
      student.id,
      document.storagePath,
    );
    const expectedStoragePath = buildEthicsApprovalStoragePath(
      student.id,
      approvalId,
      document.fileName,
    );

    if (documentApprovalId !== approvalId || document.storagePath !== expectedStoragePath) {
      throw new EthicsApprovalError(
        "All uploaded ethics documents must belong to the same submission package.",
        409,
      );
    }

    assertEthicsDocumentUpload({
      contentType: document.mimeType,
      fileSizeBytes: document.sizeBytes,
      path: expectedStoragePath,
    });
  }

  const approval = await prisma.ethicsApproval.create({
    data: {
      id: approvalId,
      studentId: student.id,
      title: parsed.data.title,
      summary: parsed.data.summary,
      documents: {
        create: parsed.data.documents.map((document) => ({
          documentType: DocumentType.ETHICS_APPROVAL,
          studentId: student.id,
          fileName: document.fileName,
          storagePath: document.storagePath,
          mimeType: document.mimeType,
          version: 1,
          isCurrentVersion: true,
        })),
      },
    },
    select: ethicsApprovalSelect,
  });

  await notifyAdministratorsOfEthicsSubmission({
    studentId: student.id,
    studentName: student.user.displayName,
    documentTitle: approval.title,
  });

  return mapEthicsApproval(approval);
}

export async function getStudentEthicsApprovalOverview(
  auth: AuthenticatedUserContext,
) {
  const student = await requireStudentEthicsContext(auth);
  const submissionBlockedReason = getEthicsSubmissionBlockedReason(student);

  return {
    approvals: student.approvals.map(mapEthicsApproval),
    latestApproval: student.approvals[0]
      ? mapEthicsApproval(student.approvals[0])
      : null,
    canSubmit: submissionBlockedReason === null,
    submissionBlockedReason,
    hasActiveRegistration: student.hasActiveRegistration,
    hasApprovedProposal: student.hasApprovedProposal,
  };
}

export async function listEthicsApprovals() {
  const approvals = await prisma.ethicsApproval.findMany({
    where: {
      isArchived: false,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: ethicsApprovalSelect,
  });

  return approvals.map(mapEthicsApproval);
}

export async function updateEthicsApprovalDecision(..._args: unknown[]) {
  throw new EthicsApprovalError(
    "Ethics is document-only. Approval or rejection decisions are not supported.",
    410,
  );
}
