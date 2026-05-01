import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";

export class AccessError extends Error {
  constructor(message: string, public status: 403 | 404 = 403) {
    super(message);
    this.name = "AccessError";
  }
}

export async function checkAccess(proposalId: string, currentUserId: string, role: UserRole) {
  if (role === UserRole.EXAMINER) {
    throw new AccessError("Examiners are not permitted to access research proposals.", 403);
  }

  const proposal = await prisma.researchProposal.findUnique({
    where: { id: proposalId },
    include: { student: true },
  });

  if (!proposal) {
    throw new AccessError("Proposal not found.", 404);
  }

  if (role === UserRole.ADMINISTRATOR) {
    return true;
  }

  if (role === UserRole.STUDENT) {
    if (proposal.student.userId !== currentUserId) {
      throw new AccessError("You can only access your own research proposals.", 403);
    }
    return true;
  }

  if (role === UserRole.SUPERVISOR) {
    const supervisor = await prisma.supervisor.findUnique({
      where: { userId: currentUserId },
    });
    if (!supervisor) {
      throw new AccessError("Supervisor profile not found.", 404);
    }

    const assignment = await prisma.supervisorAssignment.findUnique({
      where: {
        studentId_supervisorId: {
          studentId: proposal.studentId,
          supervisorId: supervisor.id,
        },
      },
    });

    if (!assignment) {
      throw new AccessError("You are not assigned to supervise this student.", 403);
    }
    return true;
  }

  throw new AccessError("Access denied.", 403);
}

export async function getProposalVersions(proposalId: string, currentUserId: string, role: UserRole) {
  await checkAccess(proposalId, currentUserId, role);

  return prisma.document.findMany({
    where: { researchProposalId: proposalId },
    orderBy: { version: 'asc' },
  });
}
