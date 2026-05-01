import {
  AcademicStatus,
  PanelEvaluationOutcome,
  ProgramType,
} from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma/client";
import { forwardSignedOffProgressReportToPanel } from "@/lib/review-panels/workflow";
import type { AuthenticatedUserContext } from "@/types/auth";

const createReviewPanelSchema = z
  .object({
    name: z.string().min(1, "Panel name is required."),
    description: z.string().trim().optional(),
    supervisorIds: z
      .array(z.string().min(1, "Supervisor id is required."))
      .min(1, "At least one supervisor must be assigned to the panel."),
    studentIds: z.array(z.string().min(1)).default([]),
    cohortProgramType: z.nativeEnum(ProgramType).optional(),
  })
  .refine(
    (value) => value.studentIds.length > 0 || value.cohortProgramType !== undefined,
    {
      message: "Assign the panel to at least one student or a cohort.",
      path: ["studentIds"],
    },
  );

const submitPanelEvaluationSchema = z.object({
  progressReportId: z.string().min(1, "Progress report id is required."),
  numericalScore: z.number().int().min(0).max(100),
  outcome: z.nativeEnum(PanelEvaluationOutcome),
  notes: z.string().trim().min(1, "Evaluation notes are required."),
});

export class ReviewPanelError extends Error {
  status: 400 | 403 | 404 | 409 | 422 | 500;

  constructor(message: string, status: 400 | 403 | 404 | 409 | 422 | 500 = 400) {
    super(message);
    this.name = "ReviewPanelError";
    this.status = status;
  }
}

async function requireAdministrator(auth: AuthenticatedUserContext) {
  const administrator = await prisma.administrator.findUnique({
    where: {
      userId: auth.userId,
    },
    select: {
      id: true,
    },
  });

  if (!administrator) {
    throw new ReviewPanelError("Administrator profile not found.", 404);
  }

  return administrator;
}

async function requireSupervisorMember(auth: AuthenticatedUserContext) {
  const supervisor = await prisma.supervisor.findUnique({
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

  if (!supervisor) {
    throw new ReviewPanelError("Supervisor profile not found.", 404);
  }

  return supervisor;
}

export function hasTwoConsecutiveFailingEvaluations(
  evaluations: Array<{ score: number | null }>,
) {
  const submittedScores = evaluations
    .map((evaluation) => evaluation.score)
    .filter((score): score is number => score !== null);

  if (submittedScores.length < 2) {
    return false;
  }

  const recentScores = submittedScores.slice(-2);
  return recentScores.every((score) => score < 50);
}

export async function createReviewPanel(
  input: z.infer<typeof createReviewPanelSchema>,
  auth: AuthenticatedUserContext,
) {
  const parsed = createReviewPanelSchema.safeParse(input);

  if (!parsed.success) {
    throw new ReviewPanelError(
      parsed.error.issues[0]?.message ?? "Invalid review panel payload.",
      400,
    );
  }

  await requireAdministrator(auth);

  const uniqueSupervisorIds = [...new Set(parsed.data.supervisorIds)];
  const uniqueStudentIds = [...new Set(parsed.data.studentIds)];

  const [supervisors, explicitStudents, cohortStudents] = await Promise.all([
    prisma.supervisor.findMany({
      where: {
        id: {
          in: uniqueSupervisorIds,
        },
        user: {
          isActive: true,
        },
      },
      select: {
        id: true,
      },
    }),
    uniqueStudentIds.length > 0
      ? prisma.student.findMany({
          where: {
            id: {
              in: uniqueStudentIds,
            },
          },
          select: {
            id: true,
          },
        })
      : Promise.resolve([]),
    parsed.data.cohortProgramType
      ? prisma.student.findMany({
          where: {
            programType: parsed.data.cohortProgramType,
            isArchived: false,
          },
          select: {
            id: true,
          },
        })
      : Promise.resolve([]),
  ]);

  if (supervisors.length !== uniqueSupervisorIds.length) {
    throw new ReviewPanelError(
      "One or more selected supervisors could not be assigned to the panel.",
      404,
    );
  }

  if (explicitStudents.length !== uniqueStudentIds.length) {
    throw new ReviewPanelError("One or more selected students were not found.", 404);
  }

  const targetStudentIds = [
    ...new Set([...explicitStudents, ...cohortStudents].map((student) => student.id)),
  ];

  if (targetStudentIds.length === 0) {
    throw new ReviewPanelError("No students matched the requested panel assignment.", 404);
  }

  const existingAssignments = await prisma.reviewPanelStudentAssignment.findMany({
    where: {
      studentId: {
        in: targetStudentIds,
      },
    },
    select: {
      studentId: true,
    },
  });

  if (existingAssignments.length > 0) {
    throw new ReviewPanelError(
      "One or more students are already assigned to another review panel.",
      409,
    );
  }

  const panel = await prisma.reviewPanel.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      cohortProgramType: parsed.data.cohortProgramType,
      memberships: {
        create: uniqueSupervisorIds.map((supervisorId) => ({
          supervisorId,
        })),
      },
      studentAssignments: {
        create: targetStudentIds.map((studentId) => ({
          studentId,
        })),
      },
    },
    select: {
      id: true,
      name: true,
      description: true,
      cohortProgramType: true,
      memberships: {
        select: {
          supervisorId: true,
        },
      },
      studentAssignments: {
        select: {
          studentId: true,
        },
      },
    },
  });

  const signedOffReports = await prisma.progressReport.findMany({
    where: {
      studentId: {
        in: targetStudentIds,
      },
      isSupervisorSignedOff: true,
    },
    select: {
      id: true,
    },
  });

  let notifiedPanelMembers = 0;
  for (const report of signedOffReports) {
    const forwarding = await forwardSignedOffProgressReportToPanel({
      progressReportId: report.id,
      supervisorName: "Administrator",
    });
    notifiedPanelMembers += forwarding.notifiedPanelMembers;
  }

  return {
    panel,
    forwardedSignedOffReports: signedOffReports.length,
    notifiedPanelMembers,
  };
}

export async function submitPanelEvaluation(
  input: z.infer<typeof submitPanelEvaluationSchema>,
  auth: AuthenticatedUserContext,
) {
  const parsed = submitPanelEvaluationSchema.safeParse(input);

  if (!parsed.success) {
    throw new ReviewPanelError(
      parsed.error.issues[0]?.message ?? "Invalid panel evaluation payload.",
      400,
    );
  }

  const supervisor = await requireSupervisorMember(auth);

  const panelEvaluation = await prisma.panelEvaluation.findFirst({
    where: {
      progressReportId: parsed.data.progressReportId,
      supervisorId: supervisor.id,
    },
    select: {
      id: true,
      reviewPanelId: true,
      progressReportId: true,
      score: true,
      progressReport: {
        select: {
          id: true,
          isSupervisorSignedOff: true,
          studentId: true,
        },
      },
    },
  });

  if (!panelEvaluation) {
    throw new ReviewPanelError(
      "This progress report has not been forwarded to your review panel.",
      403,
    );
  }

  if (!panelEvaluation.progressReport.isSupervisorSignedOff) {
    throw new ReviewPanelError(
      "Panel evaluations are only allowed after supervisor sign-off.",
      409,
    );
  }

  const submittedAt = new Date();
  const evaluation = await prisma.panelEvaluation.update({
    where: {
      id: panelEvaluation.id,
    },
    data: {
      score: parsed.data.numericalScore,
      outcome: parsed.data.outcome,
      notes: parsed.data.notes,
      submittedAt,
    },
    select: {
      id: true,
      reviewPanelId: true,
      progressReportId: true,
      supervisorId: true,
      score: true,
      outcome: true,
      notes: true,
      submittedAt: true,
    },
  });

  const recentEvaluations = await prisma.panelEvaluation.findMany({
    where: {
      progressReport: {
        studentId: panelEvaluation.progressReport.studentId,
      },
      submittedAt: {
        not: null,
      },
    },
    orderBy: {
      submittedAt: "asc",
    },
    select: {
      score: true,
    },
  });

  const underReviewTriggered = hasTwoConsecutiveFailingEvaluations(recentEvaluations);

  if (underReviewTriggered) {
    await prisma.student.update({
      where: {
        id: panelEvaluation.progressReport.studentId,
      },
      data: {
        academicStatus: AcademicStatus.UNDER_REVIEW,
      },
    });
  }

  return {
    evaluation,
    underReviewTriggered,
  };
}

export async function getReviewPanelById(
  panelId: string,
  auth: AuthenticatedUserContext,
) {
  let requestingSupervisorId: string | null = null;

  if (auth.role === "SUPERVISOR") {
    const supervisor = await requireSupervisorMember(auth);
    requestingSupervisorId = supervisor.id;
  } else if (auth.role !== "ADMINISTRATOR") {
    throw new ReviewPanelError("Forbidden.", 403);
  }

  const panel = await prisma.reviewPanel.findUnique({
    where: {
      id: panelId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      cohortProgramType: true,
      memberships: {
        select: {
          supervisorId: true,
          supervisor: {
            select: {
              user: {
                select: {
                  displayName: true,
                  email: true,
                },
              },
            },
          },
        },
      },
      studentAssignments: {
        select: {
          studentId: true,
        },
      },
      evaluations: {
        where: {
          submittedAt: {
            not: null,
          },
        },
        orderBy: {
          submittedAt: "desc",
        },
        select: {
          id: true,
          progressReportId: true,
          score: true,
          outcome: true,
          notes: true,
          submittedAt: true,
          supervisor: {
            select: {
              user: {
                select: {
                  displayName: true,
                },
              },
            },
          },
          progressReport: {
            select: {
              periodLabel: true,
              student: {
                select: {
                  user: {
                    select: {
                      displayName: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!panel) {
    throw new ReviewPanelError("Review panel not found.", 404);
  }

  if (
    requestingSupervisorId &&
    !panel.memberships.some((membership) => membership.supervisorId === requestingSupervisorId)
  ) {
    throw new ReviewPanelError("Forbidden.", 403);
  }

  return panel;
}
