import { DocumentType, ThesisStatus } from "@prisma/client";
import { z } from "zod";

import { notifyExaminerAssignedToThesis } from "@/lib/email";
import { prisma } from "@/lib/prisma/client";
import { generateDownloadSignedUrl, STORAGE_URL_EXPIRATION_MS } from "@/lib/storage";
import type { AuthenticatedUserContext } from "@/types/auth";

export const examinerAssignmentSchema = z.object({
  thesisId: z.string().min(1, "Thesis id is required."),
  examinerId: z.string().min(1, "Examiner id is required."),
});

export type ExaminerAssignmentInput = z.infer<typeof examinerAssignmentSchema>;

export class ExaminerAssignmentError extends Error {
  status: 400 | 403 | 404 | 409 | 422 | 500;

  constructor(message: string, status: 400 | 403 | 404 | 409 | 422 | 500 = 400) {
    super(message);
    this.name = "ExaminerAssignmentError";
    this.status = status;
  }
}

type AdministratorContext = {
  id: string;
  user: {
    displayName: string;
  };
};

type ExaminerContext = {
  id: string;
  userId: string;
  user: {
    id: string;
    displayName: string;
    email: string;
    isActive: boolean;
  };
};

type ThesisDocumentRecord = {
  id: string;
  fileName: string;
  storagePath: string;
  mimeType: string;
  version: number;
  isCurrentVersion: boolean;
  createdAt: Date;
};

type ThesisAssignmentView = {
  id: string;
  title: string;
  status: ThesisStatus;
  studentId: string;
  student: {
    id: string;
    user: {
      id: string;
      displayName: string;
      email: string;
    };
    supervisorAssignments: Array<{
      supervisorUserId: string;
      supervisorId: string;
    }>;
  };
  examinerAssignments: Array<{
    examinerId: string;
    examinerUserId: string;
  }>;
  documents: ThesisDocumentRecord[];
};

async function requireAdministratorContext(
  auth: AuthenticatedUserContext,
): Promise<AdministratorContext> {
  const administrator = await prisma.administrator.findUnique({
    where: {
      userId: auth.userId,
    },
    select: {
      id: true,
      user: {
        select: {
          displayName: true,
        },
      },
    },
  });

  if (!administrator) {
    throw new ExaminerAssignmentError("Administrator profile not found.", 404);
  }

  return administrator;
}

async function requireExaminer(examinerId: string): Promise<ExaminerContext> {
  const examiner = await prisma.examiner.findUnique({
    where: {
      id: examinerId,
    },
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
          isActive: true,
        },
      },
    },
  });

  if (!examiner) {
    throw new ExaminerAssignmentError("Examiner not found.", 404);
  }

  if (!examiner.user.isActive) {
    throw new ExaminerAssignmentError("Examiner account is inactive.", 409);
  }

  return examiner;
}

async function requireThesis(thesisId: string): Promise<ThesisAssignmentView> {
  const thesis = await prisma.thesis.findUnique({
    where: {
      id: thesisId,
    },
    select: {
      id: true,
      title: true,
      status: true,
      studentId: true,
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
          supervisorAssignments: {
            select: {
              supervisorUserId: true,
              supervisorId: true,
            },
          },
        },
      },
      examinerAssignments: {
        select: {
          examinerId: true,
          examinerUserId: true,
        },
      },
      documents: {
        where: {
          isDeleted: false,
          documentType: DocumentType.THESIS,
        },
        orderBy: {
          version: "asc",
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
    },
  });

  if (!thesis) {
    throw new ExaminerAssignmentError("Thesis not found.", 404);
  }

  return thesis;
}

function assertValidThesisState(thesis: ThesisAssignmentView) {
  if (
    thesis.status !== ThesisStatus.SUBMITTED &&
    thesis.status !== ThesisStatus.UNDER_EXAMINATION
  ) {
    throw new ExaminerAssignmentError(
      "Examiner assignments are only allowed while the thesis is SUBMITTED or UNDER_EXAMINATION.",
      422,
    );
  }
}

function assertNotAlreadyAssigned(
  thesis: ThesisAssignmentView,
  examiner: ExaminerContext,
) {
  const duplicateAssignment = thesis.examinerAssignments.some(
    (assignment) =>
      assignment.examinerId === examiner.id ||
      assignment.examinerUserId === examiner.userId,
  );

  if (duplicateAssignment) {
    throw new ExaminerAssignmentError(
      "This examiner is already assigned to the selected thesis.",
      409,
    );
  }
}

function assertNoSupervisorConflict(
  thesis: ThesisAssignmentView,
  examiner: ExaminerContext,
) {
  const isSupervisorForStudent = thesis.student.supervisorAssignments.some(
    (assignment) =>
      assignment.supervisorId === examiner.id ||
      assignment.supervisorUserId === examiner.userId,
  );

  if (isSupervisorForStudent) {
    throw new ExaminerAssignmentError(
      "The selected examiner cannot be assigned because they are already a supervisor for this student.",
      422,
    );
  }
}

function getCurrentThesisDocument(thesis: ThesisAssignmentView) {
  const currentDocuments = thesis.documents.filter(
    (document) => document.isCurrentVersion,
  );

  if (thesis.documents.length === 0 || currentDocuments.length !== 1) {
    throw new ExaminerAssignmentError(
      "Exactly one current thesis document must exist before assigning an examiner.",
      409,
    );
  }

  return currentDocuments[0];
}

export async function assignExaminerToThesis(
  input: ExaminerAssignmentInput,
  auth: AuthenticatedUserContext,
) {
  const parsed = examinerAssignmentSchema.safeParse(input);

  if (!parsed.success) {
    throw new ExaminerAssignmentError(
      parsed.error.issues[0]?.message ?? "Invalid examiner assignment payload.",
      400,
    );
  }

  const [administrator, thesis, examiner] = await Promise.all([
    requireAdministratorContext(auth),
    requireThesis(parsed.data.thesisId),
    requireExaminer(parsed.data.examinerId),
  ]);

  assertValidThesisState(thesis);
  assertNotAlreadyAssigned(thesis, examiner);
  assertNoSupervisorConflict(thesis, examiner);

  const currentDocument = getCurrentThesisDocument(thesis);

  const assignment = await prisma.thesisExaminerAssignment.create({
    data: {
      thesisId: thesis.id,
      studentId: thesis.studentId,
      examinerId: examiner.id,
      examinerUserId: examiner.userId,
      assignedAt: new Date(),
      assignedBy: administrator.id,
    },
    select: {
      id: true,
      thesisId: true,
      studentId: true,
      examinerId: true,
      examinerUserId: true,
      assignedAt: true,
      assignedBy: true,
    },
  });

  const secureDownloadUrl = await generateDownloadSignedUrl(currentDocument.storagePath);

  await notifyExaminerAssignedToThesis({
    recipientUserId: examiner.user.id,
    to: examiner.user.email,
    examinerName: examiner.user.displayName,
    studentName: thesis.student.user.displayName,
    thesisTitle: thesis.title,
    assignedByName: administrator.user.displayName,
    secureDownloadUrl,
  });

  return {
    assignment,
    secureDownloadUrl,
    expiresInMinutes: STORAGE_URL_EXPIRATION_MS / (60 * 1000),
  };
}
