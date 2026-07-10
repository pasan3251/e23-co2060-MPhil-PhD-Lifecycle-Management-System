import { DocumentType, RegistrationStatus } from "@prisma/client";

import { notifyInBackground } from "@/lib/notifications";
import { prisma } from "@/lib/prisma/client";
import {
  assertFileUploadConstraints,
  buildProgressReportStoragePath,
  generateUploadSignedUrl,
  normalizeStoragePath,
  StorageAccessError,
  STORAGE_URL_EXPIRATION_MS,
} from "@/lib/storage";
import {
  progressReportSubmissionSchema,
  type ProgressReportDocumentInput,
  type ProgressReportSubmissionInput,
} from "@/lib/progress-reports/schemas";
import type { AuthenticatedUserContext } from "@/types/auth";

export class ProgressReportSubmissionError extends Error {
  status: 400 | 403 | 404 | 409 | 413 | 500;

  constructor(message: string, status: 400 | 403 | 404 | 409 | 413 | 500 = 400) {
    super(message);
    this.name = "ProgressReportSubmissionError";
    this.status = status;
  }
}

type StudentProgressReportContext = {
  id: string;
  user: {
    id: string;
    displayName: string;
  };
  registrations: Array<{
    id: string;
  }>;
  supervisorAssignments: Array<{
    supervisor: {
      user: {
        id: string;
        displayName: string;
        email: string;
        isActive: boolean;
      };
    };
  }>;
};

function assertProgressReportDocumentUpload(input: {
  contentType: string;
  fileSizeBytes: number;
  path: string;
}) {
  try {
    assertFileUploadConstraints(input);
  } catch (error) {
    if (error instanceof StorageAccessError) {
      throw new ProgressReportSubmissionError(error.message, error.status);
    }

    throw error;
  }

  const normalizedPath = normalizeStoragePath(input.path);

  if (!normalizedPath.startsWith("progress-reports/")) {
    throw new ProgressReportSubmissionError(
      "Progress report documents must be uploaded to the progress-reports directory.",
      400,
    );
  }
}

async function requireStudentProgressReportContext(
  auth: AuthenticatedUserContext,
): Promise<StudentProgressReportContext> {
  if (auth.role !== "STUDENT") {
    throw new ProgressReportSubmissionError(
      "Only students can submit progress reports.",
      403,
    );
  }

  const student = await prisma.student.findUnique({
    where: {
      userId: auth.userId,
    },
    select: {
      id: true,
      user: {
        select: {
          id: true,
          displayName: true,
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
      supervisorAssignments: {
        select: {
          supervisor: {
            select: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  email: true,
                  isActive: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!student) {
    throw new ProgressReportSubmissionError("Student profile not found.", 404);
  }

  if (student.registrations.length === 0) {
    throw new ProgressReportSubmissionError(
      "Your registration is lapsed. Renew it before submitting progress reports.",
      403,
    );
  }

  return student;
}

function buildDocumentCreateInput(input: {
  studentId: string;
  progressReportId: string;
  document: ProgressReportDocumentInput;
}) {
  const storagePath = buildProgressReportStoragePath(
    input.studentId,
    input.progressReportId,
    input.document.fileName,
  );

  assertProgressReportDocumentUpload({
    contentType: input.document.mimeType,
    fileSizeBytes: input.document.sizeBytes,
    path: storagePath,
  });

  return {
    documentType: DocumentType.PROGRESS_REPORT,
    studentId: input.studentId,
    progressReportId: input.progressReportId,
    fileName: input.document.fileName,
    storagePath,
    mimeType: input.document.mimeType,
    version: 1,
    isCurrentVersion: true,
  };
}

function notifyAssignedSupervisors(input: {
  student: StudentProgressReportContext;
  periodLabel: string;
}) {
  for (const assignment of input.student.supervisorAssignments) {
    const supervisor = assignment.supervisor.user;

    if (!supervisor.isActive || !supervisor.email) {
      continue;
    }

    notifyInBackground({
      event: "PROGRESS_REPORT_SUBMITTED",
      recipientUserId: supervisor.id,
      to: supervisor.email,
      supervisorName: supervisor.displayName,
      studentName: input.student.user.displayName,
      studentId: input.student.id,
      periodLabel: input.periodLabel,
    });
  }
}

export async function submitProgressReport(
  input: ProgressReportSubmissionInput,
  auth: AuthenticatedUserContext,
) {
  const parsed = progressReportSubmissionSchema.safeParse(input);

  if (!parsed.success) {
    throw new ProgressReportSubmissionError(
      parsed.error.issues[0]?.message ?? "Invalid progress report submission.",
      400,
    );
  }

  const student = await requireStudentProgressReportContext(auth);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const report = await tx.progressReport.create({
        data: {
          studentId: student.id,
          periodLabel: parsed.data.periodLabel,
          narrative: parsed.data.narrative,
          isOverdue: false,
        },
        select: {
          id: true,
          studentId: true,
          periodLabel: true,
          narrative: true,
          isSupervisorSignedOff: true,
          isOverdue: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (parsed.data.documents.length === 0) {
        return {
          report,
          documents: [],
        };
      }

      const documents = await Promise.all(
        parsed.data.documents.map((document) =>
          tx.document.create({
            data: buildDocumentCreateInput({
              studentId: student.id,
              progressReportId: report.id,
              document,
            }),
            select: {
              id: true,
              fileName: true,
              storagePath: true,
              mimeType: true,
              version: true,
              isCurrentVersion: true,
              createdAt: true,
            },
          }),
        ),
      );

      return {
        report,
        documents,
      };
    });

    const uploads = await Promise.all(
      result.documents.map(async (document) => ({
        signedUrl: await generateUploadSignedUrl(
          document.storagePath,
          document.mimeType,
        ),
        storagePath: document.storagePath,
        expiresInMinutes: STORAGE_URL_EXPIRATION_MS / (60 * 1000),
      })),
    );

    notifyAssignedSupervisors({
      student,
      periodLabel: result.report.periodLabel,
    });

    return {
      report: {
        ...result.report,
        documents: result.documents,
      },
      upload: uploads[0] ?? null,
      uploads,
    };
  } catch (error) {
    if (error instanceof ProgressReportSubmissionError) {
      throw error;
    }

    if (error instanceof StorageAccessError) {
      throw new ProgressReportSubmissionError(error.message, error.status);
    }

    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      throw new ProgressReportSubmissionError(
        "A progress report for this period already exists.",
        409,
      );
    }

    throw new ProgressReportSubmissionError(
      error instanceof Error ? error.message : "Unable to submit progress report.",
      500,
    );
  }
}
