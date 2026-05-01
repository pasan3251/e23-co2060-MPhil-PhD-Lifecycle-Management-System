import { DocumentType, type Prisma } from "@prisma/client";

import { generateDownloadSignedUrl } from "@/lib/storage";
import { prisma } from "@/lib/prisma/client";
import type { AuthenticatedUserContext } from "@/types/auth";

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class DocumentRepositoryError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 403 | 404 | 410,
  ) {
    super(message);
    this.name = "DocumentRepositoryError";
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DocumentSearchQuery = {
  q?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
};

export type DocumentListItem = {
  id: string;
  documentType: DocumentType;
  fileName: string;
  mimeType: string;
  version: number;
  isCurrentVersion: boolean;
  isDeleted: boolean;
  storagePath: string;
  studentId: string | null;
  applicationId: string | null;
  researchProposalId: string | null;
  progressReportId: string | null;
  thesisId: string | null;
  correctionDocumentId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// ---------------------------------------------------------------------------
// Access control — builds the Prisma `where` scope per role
// ---------------------------------------------------------------------------

async function buildAccessScope(
  auth: AuthenticatedUserContext,
): Promise<Prisma.DocumentWhereInput> {
  switch (auth.role) {
    case "ADMINISTRATOR":
      return {};

    case "STUDENT": {
      const student = await prisma.student.findFirst({
        where: { userId: auth.userId },
        select: { id: true },
      });

      if (!student) {
        throw new DocumentRepositoryError("Student profile not found.", 403);
      }

      return { studentId: student.id };
    }

    case "SUPERVISOR": {
      const supervisor = await prisma.supervisor.findFirst({
        where: { userId: auth.userId },
        select: { id: true },
      });

      if (!supervisor) {
        throw new DocumentRepositoryError("Supervisor profile not found.", 403);
      }

      const assignments = await prisma.supervisorAssignment.findMany({
        where: { supervisorId: supervisor.id },
        select: { studentId: true },
      });

      const assignedStudentIds = assignments.map((a) => a.studentId);

      return { studentId: { in: assignedStudentIds } };
    }

    case "EXAMINER": {
      const examiner = await prisma.examiner.findFirst({
        where: { userId: auth.userId },
        select: { id: true },
      });

      if (!examiner) {
        throw new DocumentRepositoryError("Examiner profile not found.", 403);
      }

      const assignments = await prisma.thesisExaminerAssignment.findMany({
        where: { examinerId: examiner.id },
        select: { thesisId: true },
      });

      const assignedThesisIds = assignments.map((a) => a.thesisId);

      // Examiners may only see THESIS documents for their assigned theses
      return {
        documentType: DocumentType.THESIS,
        thesisId: { in: assignedThesisIds },
      };
    }

    default:
      throw new DocumentRepositoryError("Unsupported role.", 403);
  }
}

// ---------------------------------------------------------------------------
// Validate that the category filter is permitted for the given role
// ---------------------------------------------------------------------------

function assertCategoryAccessForRole(
  role: AuthenticatedUserContext["role"],
  category: string,
): void {
  if (role !== "EXAMINER") return;

  const allowedForExaminers: string[] = [DocumentType.THESIS];

  if (!allowedForExaminers.includes(category)) {
    throw new DocumentRepositoryError(
      "Examiners may only access THESIS documents.",
      403,
    );
  }
}

// ---------------------------------------------------------------------------
// searchDocuments
// ---------------------------------------------------------------------------

export async function searchDocuments(
  query: DocumentSearchQuery,
  auth: AuthenticatedUserContext,
): Promise<DocumentListItem[]> {
  const {
    q,
    category,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = query;

  if (category) {
    assertCategoryAccessForRole(auth.role, category);
  }

  const accessScope = await buildAccessScope(auth);

  const categoryFilter: Prisma.DocumentWhereInput = category
    ? { documentType: category as DocumentType }
    : {};

  const textFilter: Prisma.DocumentWhereInput = q
    ? { fileName: { contains: q, mode: "insensitive" } }
    : {};

  const dateFilter: Prisma.DocumentWhereInput = {};
  if (startDate ?? endDate) {
    dateFilter.createdAt = {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate ? { lte: new Date(endDate) } : {}),
    };
  }

  const skip = (page - 1) * limit;

  const documents = await prisma.document.findMany({
    where: {
      isDeleted: false,
      ...accessScope,
      ...categoryFilter,
      ...textFilter,
      ...dateFilter,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip,
  });

  return documents;
}

// ---------------------------------------------------------------------------
// getDocumentDownloadUrl
// ---------------------------------------------------------------------------

export async function getDocumentDownloadUrl(
  documentId: string,
  auth: AuthenticatedUserContext,
): Promise<string> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    throw new DocumentRepositoryError("Document not found.", 404);
  }

  // Soft-deleted: admins can still download, others receive 410 Gone
  if (document.isDeleted) {
    if (auth.role !== "ADMINISTRATOR") {
      throw new DocumentRepositoryError(
        "This document has been removed and is no longer available.",
        410,
      );
    }
  }

  // Verify access scope for the requester (even if not deleted)
  if (auth.role !== "ADMINISTRATOR") {
    const accessScope = await buildAccessScope(auth);
    const accessible = await prisma.document.findFirst({
      where: {
        id: documentId,
        ...accessScope,
      },
      select: { id: true },
    });

    if (!accessible) {
      throw new DocumentRepositoryError(
        "You do not have permission to access this document.",
        403,
      );
    }

    // Block examiners from non-thesis documents
    if (auth.role === "EXAMINER" && document.documentType !== DocumentType.THESIS) {
      throw new DocumentRepositoryError(
        "Examiners may only access THESIS documents.",
        403,
      );
    }
  }

  return generateDownloadSignedUrl(document.storagePath);
}

// ---------------------------------------------------------------------------
// softDeleteDocument
// ---------------------------------------------------------------------------

export async function softDeleteDocument(documentId: string): Promise<void> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, isDeleted: true },
  });

  if (!document) {
    throw new DocumentRepositoryError("Document not found.", 404);
  }

  await prisma.document.update({
    where: { id: documentId },
    data: { isDeleted: true },
  });
}
