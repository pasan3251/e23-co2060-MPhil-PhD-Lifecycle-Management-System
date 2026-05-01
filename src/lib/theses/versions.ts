import {
  DocumentType,
  NotificationDeliveryStatus,
  NotificationEvent,
  ThesisStatus,
  UserRole,
} from "@prisma/client";

import { prisma } from "@/lib/prisma/client";
import {
  generateDownloadSignedUrl,
  STORAGE_URL_EXPIRATION_MS,
} from "@/lib/storage";
import type { AuthenticatedUserContext } from "@/types/auth";

type ThesisDocumentRecord = {
  id: string;
  fileName: string;
  storagePath: string;
  mimeType: string;
  version: number;
  isCurrentVersion: boolean;
  createdAt: Date;
};

type ThesisAccessRecord = {
  id: string;
  title: string;
  status: ThesisStatus;
  student: {
    id: string;
    user: {
      id: string;
      displayName: string;
      email: string;
    };
  };
  examinerAssignments: Array<{
    examinerId: string;
    examinerUserId: string;
  }>;
  documents: ThesisDocumentRecord[];
};

export class ThesisVersionError extends Error {
  status: 400 | 403 | 404 | 409 | 500;

  constructor(message: string, status: 400 | 403 | 404 | 409 | 500 = 400) {
    super(message);
    this.name = "ThesisVersionError";
    this.status = status;
  }
}

async function findThesisAccessRecord(
  thesisId: string,
): Promise<ThesisAccessRecord | null> {
  return prisma.thesis.findUnique({
    where: {
      id: thesisId,
    },
    select: {
      id: true,
      title: true,
      status: true,
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
}

export function assertSingleCurrentThesisDocument(
  documents: Array<Pick<ThesisDocumentRecord, "isCurrentVersion">>,
) {
  const currentDocumentCount = documents.filter(
    (document) => document.isCurrentVersion,
  ).length;

  if (documents.length === 0 || currentDocumentCount !== 1) {
    throw new ThesisVersionError(
      "Exactly one thesis Document record must be marked as the current version.",
      409,
    );
  }
}

export function checkAccess(
  auth: AuthenticatedUserContext,
  thesis: Pick<ThesisAccessRecord, "student" | "examinerAssignments">,
) {
  if (auth.role === UserRole.ADMINISTRATOR) {
    return;
  }

  if (auth.role === UserRole.STUDENT) {
    if (thesis.student.user.id === auth.userId) {
      return;
    }

    throw new ThesisVersionError("Thesis access denied.", 403);
  }

  if (auth.role === UserRole.EXAMINER) {
    const isAssigned = thesis.examinerAssignments.some(
      (assignment) => assignment.examinerUserId === auth.userId,
    );

    if (isAssigned) {
      return;
    }

    throw new ThesisVersionError("Thesis access denied.", 403);
  }

  throw new ThesisVersionError(
    "Supervisors are not allowed to access thesis downloads.",
    403,
  );
}

function mapThesisDocumentRecord(record: ThesisDocumentRecord) {
  return {
    id: record.id,
    fileName: record.fileName,
    storagePath: record.storagePath,
    mimeType: record.mimeType,
    version: record.version,
    isCurrentVersion: record.isCurrentVersion,
    createdAt: record.createdAt,
  };
}

async function writeThesisDownloadAuditLog(input: {
  examinerUserId: string;
  thesisId: string;
  storagePath: string;
}) {
  try {
    await prisma.notificationLog.create({
      data: {
        recipientId: input.examinerUserId,
        event: NotificationEvent.THESIS_DOWNLOADED,
        subject: `Thesis download accessed: ${input.thesisId}`,
        deliveryStatus: NotificationDeliveryStatus.SENT,
        metadata: {
          thesisId: input.thesisId,
          storagePath: input.storagePath,
          downloadedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Failed to write thesis download audit log.", error);
  }
}

export async function getThesisVersions(
  thesisId: string,
  auth: AuthenticatedUserContext,
) {
  const thesis = await findThesisAccessRecord(thesisId);

  if (!thesis) {
    throw new ThesisVersionError("Thesis not found.", 404);
  }

  checkAccess(auth, thesis);
  assertSingleCurrentThesisDocument(thesis.documents);

  return {
    thesis: {
      id: thesis.id,
      title: thesis.title,
      status: thesis.status,
      student: {
        id: thesis.student.id,
        displayName: thesis.student.user.displayName,
        email: thesis.student.user.email,
      },
    },
    versions: thesis.documents.map(mapThesisDocumentRecord),
  };
}

export async function getThesisVersionDownloadUrl(
  thesisId: string,
  version: number,
  auth: AuthenticatedUserContext,
) {
  if (!Number.isInteger(version) || version <= 0) {
    throw new ThesisVersionError("Invalid thesis version number.", 400);
  }

  const thesis = await findThesisAccessRecord(thesisId);

  if (!thesis) {
    throw new ThesisVersionError("Thesis not found.", 404);
  }

  checkAccess(auth, thesis);
  assertSingleCurrentThesisDocument(thesis.documents);

  const document = thesis.documents.find((record) => record.version === version);

  if (!document) {
    throw new ThesisVersionError("Thesis version not found.", 404);
  }

  const downloadUrl = await generateDownloadSignedUrl(document.storagePath);

  return {
    thesis: {
      id: thesis.id,
      title: thesis.title,
      status: thesis.status,
    },
    version: mapThesisDocumentRecord(document),
    downloadUrl,
    expiresInMinutes: STORAGE_URL_EXPIRATION_MS / (60 * 1000),
  };
}

export async function getCurrentThesisDownloadUrl(
  thesisId: string,
  auth: AuthenticatedUserContext,
) {
  const thesis = await findThesisAccessRecord(thesisId);

  if (!thesis) {
    throw new ThesisVersionError("Thesis not found.", 404);
  }

  checkAccess(auth, thesis);
  assertSingleCurrentThesisDocument(thesis.documents);

  const document = thesis.documents.find((record) => record.isCurrentVersion);

  if (!document) {
    throw new ThesisVersionError("Current thesis document not found.", 404);
  }

  const downloadUrl = await generateDownloadSignedUrl(document.storagePath);

  if (auth.role === UserRole.EXAMINER) {
    await writeThesisDownloadAuditLog({
      examinerUserId: auth.userId,
      thesisId: thesis.id,
      storagePath: document.storagePath,
    });
  }

  return {
    thesis: {
      id: thesis.id,
      title: thesis.title,
      status: thesis.status,
      student: {
        id: thesis.student.id,
        displayName: thesis.student.user.displayName,
        email: thesis.student.user.email,
      },
    },
    document: mapThesisDocumentRecord(document),
    downloadUrl,
    expiresInMinutes: STORAGE_URL_EXPIRATION_MS / (60 * 1000),
  };
}
