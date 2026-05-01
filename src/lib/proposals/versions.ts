import { ProposalStatus, UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";
import {
  generateDownloadSignedUrl,
  STORAGE_URL_EXPIRATION_MS,
} from "@/lib/storage";
import type { AuthenticatedUserContext } from "@/types/auth";

type ProposalVersionRecord = {
  id: string;
  fileName: string;
  storagePath: string;
  mimeType: string;
  version: number;
  isCurrentVersion: boolean;
  createdAt: Date;
};

type ProposalAccessRecord = {
  id: string;
  title: string;
  status: ProposalStatus;
  student: {
    id: string;
    user: {
      id: string;
      displayName: string;
      email: string;
    };
    supervisorAssignments: Array<{
      supervisorId: string;
      supervisorUserId: string;
    }>;
  };
  documents: ProposalVersionRecord[];
};

export class ProposalVersionError extends Error {
  status: 400 | 403 | 404 | 409 | 500;

  constructor(message: string, status: 400 | 403 | 404 | 409 | 500 = 400) {
    super(message);
    this.name = "ProposalVersionError";
    this.status = status;
  }
}

function mapProposalVersionRecord(record: ProposalVersionRecord) {
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

async function findProposalAccessRecord(
  proposalId: string,
): Promise<ProposalAccessRecord | null> {
  return prisma.researchProposal.findUnique({
    where: {
      id: proposalId,
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
          supervisorAssignments: {
            select: {
              supervisorId: true,
              supervisorUserId: true,
            },
          },
        },
      },
      documents: {
        where: {
          isDeleted: false,
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

export function assertSingleCurrentProposalVersion(
  documents: Array<Pick<ProposalVersionRecord, "isCurrentVersion">>,
) {
  const currentVersionCount = documents.filter(
    (document) => document.isCurrentVersion,
  ).length;

  if (documents.length === 0 || currentVersionCount !== 1) {
    throw new ProposalVersionError(
      "Exactly one Document record per proposal must be marked as the current version.",
      409,
    );
  }
}

export function checkAccess(
  auth: AuthenticatedUserContext,
  proposal: Pick<ProposalAccessRecord, "student">,
) {
  if (auth.role === UserRole.ADMINISTRATOR) {
    return;
  }

  if (auth.role === UserRole.EXAMINER) {
    throw new ProposalVersionError(
      "Examiners are not allowed to access research proposals.",
      403,
    );
  }

  if (auth.role === UserRole.STUDENT) {
    if (proposal.student.user.id === auth.userId) {
      return;
    }

    throw new ProposalVersionError("Proposal access denied.", 403);
  }

  if (auth.role === UserRole.SUPERVISOR) {
    const isAssigned = proposal.student.supervisorAssignments.some(
      (assignment) => assignment.supervisorUserId === auth.userId,
    );

    if (isAssigned) {
      return;
    }

    throw new ProposalVersionError("Proposal access denied.", 403);
  }
}

export async function getProposalVersions(
  proposalId: string,
  auth: AuthenticatedUserContext,
) {
  const proposal = await findProposalAccessRecord(proposalId);

  if (!proposal) {
    throw new ProposalVersionError("Research proposal not found.", 404);
  }

  checkAccess(auth, proposal);
  assertSingleCurrentProposalVersion(proposal.documents);

  return {
    proposal: {
      id: proposal.id,
      title: proposal.title,
      status: proposal.status,
      student: {
        id: proposal.student.id,
        displayName: proposal.student.user.displayName,
        email: proposal.student.user.email,
      },
    },
    versions: proposal.documents.map(mapProposalVersionRecord),
  };
}

export async function getProposalVersionDownloadUrl(
  proposalId: string,
  version: number,
  auth: AuthenticatedUserContext,
) {
  if (!Number.isInteger(version) || version <= 0) {
    throw new ProposalVersionError("Invalid proposal version number.", 400);
  }

  const proposal = await findProposalAccessRecord(proposalId);

  if (!proposal) {
    throw new ProposalVersionError("Research proposal not found.", 404);
  }

  checkAccess(auth, proposal);
  assertSingleCurrentProposalVersion(proposal.documents);

  const document = proposal.documents.find((record) => record.version === version);

  if (!document) {
    throw new ProposalVersionError("Proposal version not found.", 404);
  }

  const downloadUrl = await generateDownloadSignedUrl(document.storagePath);

  return {
    proposal: {
      id: proposal.id,
      title: proposal.title,
      status: proposal.status,
    },
    version: mapProposalVersionRecord(document),
    downloadUrl,
    expiresInMinutes: STORAGE_URL_EXPIRATION_MS / (60 * 1000),
  };
}
