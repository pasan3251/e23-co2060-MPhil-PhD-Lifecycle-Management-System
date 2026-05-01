import { prisma } from "@/lib/prisma/client";
import { notifyProgressReportSignedOff } from "@/lib/email";

export class ReviewPanelWorkflowError extends Error {
  status: 400 | 403 | 404 | 409 | 500;

  constructor(message: string, status: 400 | 403 | 404 | 409 | 500 = 400) {
    super(message);
    this.name = "ReviewPanelWorkflowError";
    this.status = status;
  }
}

type ForwardableProgressReport = {
  id: string;
  periodLabel: string;
  isSupervisorSignedOff: boolean;
  student: {
    id: string;
    user: {
      displayName: string;
    };
    reviewPanelAssignment: {
      reviewPanel: {
        id: string;
        name: string;
        memberships: Array<{
          supervisor: {
            id: string;
            user: {
              id: string;
              email: string;
              displayName: string;
              isActive: boolean;
            };
          };
        }>;
      };
    } | null;
  };
};

async function findForwardableProgressReport(
  progressReportId: string,
): Promise<ForwardableProgressReport | null> {
  return prisma.progressReport.findUnique({
    where: {
      id: progressReportId,
    },
    select: {
      id: true,
      periodLabel: true,
      isSupervisorSignedOff: true,
      student: {
        select: {
          id: true,
          user: {
            select: {
              displayName: true,
            },
          },
          reviewPanelAssignment: {
            select: {
              reviewPanel: {
                select: {
                  id: true,
                  name: true,
                  memberships: {
                    select: {
                      supervisor: {
                        select: {
                          id: true,
                          user: {
                            select: {
                              id: true,
                              email: true,
                              displayName: true,
                              isActive: true,
                            },
                          },
                        },
                      },
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
}

export async function forwardSignedOffProgressReportToPanel(input: {
  progressReportId: string;
  supervisorName: string;
}) {
  const report = await findForwardableProgressReport(input.progressReportId);

  if (!report) {
    throw new ReviewPanelWorkflowError("Progress report not found.", 404);
  }

  if (!report.isSupervisorSignedOff) {
    throw new ReviewPanelWorkflowError(
      "Progress reports can only be forwarded after supervisor sign-off.",
      409,
    );
  }

  const assignedPanel = report.student.reviewPanelAssignment?.reviewPanel;

  if (!assignedPanel) {
    return {
      forwardedToPanel: false,
      notifiedPanelMembers: 0,
      reviewPanelId: null,
    };
  }

  const activeMembers = assignedPanel.memberships.filter(
    (membership) => membership.supervisor.user.isActive,
  );

  if (activeMembers.length === 0) {
    return {
      forwardedToPanel: true,
      notifiedPanelMembers: 0,
      reviewPanelId: assignedPanel.id,
    };
  }

  const existingEvaluations = await prisma.panelEvaluation.findMany({
    where: {
      reviewPanelId: assignedPanel.id,
      progressReportId: report.id,
      supervisorId: {
        in: activeMembers.map((membership) => membership.supervisor.id),
      },
    },
    select: {
      supervisorId: true,
    },
  });

  const existingSupervisorIds = new Set(
    existingEvaluations.map((evaluation) => evaluation.supervisorId),
  );
  const pendingMembers = activeMembers.filter(
    (membership) => !existingSupervisorIds.has(membership.supervisor.id),
  );

  if (pendingMembers.length > 0) {
    await prisma.panelEvaluation.createMany({
      data: pendingMembers.map((membership) => ({
        reviewPanelId: assignedPanel.id,
        progressReportId: report.id,
        supervisorId: membership.supervisor.id,
      })),
    });

    await Promise.all(
      pendingMembers.map((membership) =>
        notifyProgressReportSignedOff({
          recipientUserId: membership.supervisor.user.id,
          to: membership.supervisor.user.email,
          panelMemberName: membership.supervisor.user.displayName,
          studentName: report.student.user.displayName,
          periodLabel: report.periodLabel,
          supervisorName: input.supervisorName,
          reviewPanelName: assignedPanel.name,
        }),
      ),
    );
  }

  return {
    forwardedToPanel: true,
    notifiedPanelMembers: pendingMembers.length,
    reviewPanelId: assignedPanel.id,
  };
}
