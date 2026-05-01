import { ProposalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import {
  EvaluationSubmissionInput,
  evaluationSubmissionSchema,
} from "@/lib/proposals/schemas";
import { notifyProposalEvaluationSubmitted } from "@/lib/email";
import { ProposalSubmissionError } from "@/lib/proposals/submission";

export async function submitEvaluation(
  proposalId: string,
  input: EvaluationSubmissionInput,
  currentUserId: string,
) {
  const parsed = evaluationSubmissionSchema.safeParse(input);

  if (!parsed.success) {
    throw new ProposalSubmissionError(
      parsed.error.issues[0]?.message ?? "Invalid evaluation.",
      400,
    );
  }

  const supervisor = await prisma.supervisor.findUnique({
    where: { userId: currentUserId },
    include: { user: true },
  });

  if (!supervisor) {
    throw new ProposalSubmissionError("Unauthorized. Only supervisors can evaluate.", 403);
  }

  const proposal = await prisma.researchProposal.findUnique({
    where: { id: proposalId },
    include: { student: { include: { user: true } } },
  });

  if (!proposal) {
    throw new ProposalSubmissionError("Proposal not found.", 404);
  }

  if (proposal.status !== ProposalStatus.UNDER_REVIEW) {
    throw new ProposalSubmissionError("Proposal must be UNDER_REVIEW to be evaluated.", 400);
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
    throw new ProposalSubmissionError("You are not assigned to supervise this student.", 403);
  }

  const existingEvaluation = await prisma.evaluationForm.findUnique({
    where: {
      researchProposalId_supervisorId: {
        researchProposalId: proposal.id,
        supervisorId: supervisor.id,
      },
    },
  });

  if (existingEvaluation) {
    throw new ProposalSubmissionError("You have already evaluated this proposal.", 409);
  }

  const evaluation = await prisma.evaluationForm.create({
    data: {
      researchProposalId: proposal.id,
      supervisorId: supervisor.id,
      score: parsed.data.score,
      feedback: parsed.data.feedback,
    },
  });

  const administrators = await prisma.administrator.findMany({
    include: { user: true },
  });

  await Promise.all(
    administrators.map((admin) =>
      notifyProposalEvaluationSubmitted({
        recipientUserId: admin.user.id,
        to: admin.user.email,
        administratorName: admin.user.displayName,
        supervisorName: supervisor.user.displayName,
        studentName: proposal.student.user.displayName,
        proposalTitle: proposal.title,
      }),
    ),
  );

  return evaluation;
}

export async function aggregateScores(proposalId: string) {
  const evaluations = await prisma.evaluationForm.findMany({
    where: { researchProposalId: proposalId },
    select: { score: true },
  });

  if (evaluations.length === 0) {
    return { average: 0, count: 0 };
  }

  const total = evaluations.reduce((sum, ev) => sum + ev.score, 0);
  return {
    average: total / evaluations.length,
    count: evaluations.length,
  };
}
