import { DocumentType, UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks (vi.mock factories cannot reference top-level variables — inline all data)
// ---------------------------------------------------------------------------

vi.mock("@/lib/firebase/auth", () => ({
  authenticateBearerRequest: vi.fn(),
  AuthError: class AuthError extends Error {
    status: 401 | 403;

    constructor(message: string, status: 401 | 403) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    student: {
      findFirst: vi.fn(),
    },
    supervisor: {
      findFirst: vi.fn(),
    },
    examiner: {
      findFirst: vi.fn(),
    },
    supervisorAssignment: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    thesisExaminerAssignment: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    document: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn().mockResolvedValue({ id: "doc-student-1", isDeleted: true }),
    },
  },
}));

vi.mock("@/lib/storage", () => ({
  generateDownloadSignedUrl: vi.fn().mockResolvedValue("https://signed-url"),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { GET as GET_DOWNLOAD, DELETE } from "@/app/api/documents/[id]/route";
import { authenticateBearerRequest } from "@/lib/firebase/auth";
import { prisma } from "@/lib/prisma/client";

// ---------------------------------------------------------------------------
// Shared data factories (defined AFTER mocks)
// ---------------------------------------------------------------------------

const makeOwnedDoc = () => ({
  id: "doc-student-1",
  documentType: DocumentType.PROPOSAL,
  fileName: "proposal.pdf",
  mimeType: "application/pdf",
  version: 1,
  isCurrentVersion: true,
  isDeleted: false,
  storagePath: "proposals/student-1/1/proposal.pdf",
  studentId: "student-1",
  applicationId: null,
  researchProposalId: "proposal-1",
  progressReportId: null,
  thesisId: null,
  correctionDocumentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const makeDeletedDoc = () => ({ ...makeOwnedDoc(), id: "doc-deleted-1", isDeleted: true });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGetRequest(id: string) {
  return new Request(`http://localhost/api/documents/${id}`, {
    method: "GET",
    headers: { authorization: "Bearer token" },
  }) as never;
}

function makeDeleteRequest(id: string) {
  return new Request(`http://localhost/api/documents/${id}`, {
    method: "DELETE",
    headers: { authorization: "Bearer token" },
  }) as never;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/documents/[id] — Student cross-access returns 403", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when a Student tries to access a document belonging to another student", async () => {
    vi.mocked(authenticateBearerRequest).mockResolvedValue({
      uid: "firebase-student-2",
      userId: "user-student-2",
      firebaseUid: "firebase-student-2",
      role: UserRole.STUDENT,
    } as never);

    // Student profile is "student-2"
    vi.mocked(prisma.student.findFirst).mockResolvedValue({ id: "student-2" } as never);

    // The document belongs to student-1 — scope lookup finds nothing for student-2
    vi.mocked(prisma.document.findUnique).mockResolvedValue(makeOwnedDoc() as never);
    vi.mocked(prisma.document.findFirst).mockResolvedValue(null as never);

    const response = await GET_DOWNLOAD(
      makeGetRequest("doc-student-1"),
      {
        params: { id: "doc-student-1" },
        auth: { uid: "firebase-student-2", userId: "user-student-2", firebaseUid: "firebase-student-2", role: "STUDENT" },
      },
    );

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });
});

describe("GET /api/documents/[id] — Soft-deleted document returns 410 for non-admins, 200 for Admin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 410 Gone when a Student requests a soft-deleted document", async () => {
    vi.mocked(authenticateBearerRequest).mockResolvedValue({
      uid: "firebase-student-1",
      userId: "user-student-1",
      firebaseUid: "firebase-student-1",
      role: UserRole.STUDENT,
    } as never);

    vi.mocked(prisma.student.findFirst).mockResolvedValue({ id: "student-1" } as never);
    vi.mocked(prisma.document.findUnique).mockResolvedValue(makeDeletedDoc() as never);

    const response = await GET_DOWNLOAD(
      makeGetRequest("doc-deleted-1"),
      {
        params: { id: "doc-deleted-1" },
        auth: { uid: "firebase-student-1", userId: "user-student-1", firebaseUid: "firebase-student-1", role: "STUDENT" },
      },
    );

    expect(response.status).toBe(410);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("returns 200 with a signed URL when Admin requests a soft-deleted document", async () => {
    vi.mocked(authenticateBearerRequest).mockResolvedValue({
      uid: "firebase-admin",
      userId: "user-admin",
      firebaseUid: "firebase-admin",
      role: UserRole.ADMINISTRATOR,
    } as never);

    vi.mocked(prisma.document.findUnique).mockResolvedValue(makeDeletedDoc() as never);

    const response = await GET_DOWNLOAD(
      makeGetRequest("doc-deleted-1"),
      {
        params: { id: "doc-deleted-1" },
        auth: { uid: "firebase-admin", userId: "user-admin", firebaseUid: "firebase-admin", role: "ADMINISTRATOR" },
      },
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.downloadUrl).toBe("https://signed-url");
  });
});

describe("DELETE /api/documents/[id] — Admin soft-delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("soft-deletes the document and marks isDeleted=true without calling Firebase delete", async () => {
    vi.mocked(authenticateBearerRequest).mockResolvedValue({
      uid: "firebase-admin",
      userId: "user-admin",
      firebaseUid: "firebase-admin",
      role: UserRole.ADMINISTRATOR,
    } as never);

    vi.mocked(prisma.document.findUnique).mockResolvedValue(makeOwnedDoc() as never);

    const response = await DELETE(
      makeDeleteRequest("doc-student-1"),
      {
        params: { id: "doc-student-1" },
        auth: { uid: "firebase-admin", userId: "user-admin", firebaseUid: "firebase-admin", role: "ADMINISTRATOR" },
      },
    );

    expect(response.status).toBe(200);
    expect(prisma.document.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isDeleted: true } }),
    );
  });
});
