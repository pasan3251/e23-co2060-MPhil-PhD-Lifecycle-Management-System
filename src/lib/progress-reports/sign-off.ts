import { z } from "zod";

import { prisma } from "@/lib/prisma/client";
import { forwardSignedOffProgressReportToPanel } from "@/lib/review-panels/workflow";
import type { AuthenticatedUserContext } from "@/types/auth";

const signOffProgressReportSchema = z.object({
  id: z.string().min(1, "Progress report id is required."),
});

type ProgressReportSignOffRecord = {
  id: string;
  studentId: string;
  periodLabel: string;
  isSupervisorSignedOff: boolean;
  supervisorSignedOffAt: Date | null;
  student: {
    id: string;
    user: {
      displayName: string;
    };
    supervisorAssignments: Array<{
      supervisorId: string;
      isPrimary: boolean;
    }>;
  };
};

type SupervisorContext = {
  id: string;
  user: {
    displayName: string;
  };
};

export class ProgressReportSignOffError extends Error {
  status: 400 | 403 | 404 | 409 | 500;

  constructor(message: string, status: 400 | 403 | 404 | 409 | 500 = 400) {
    super(message);
    this.name = "ProgressReportSignOffError";
    this.status = status;
  }
}

async function requireSupervisorContext(
  auth: AuthenticatedUserContext,
): Promise<SupervisorContext> {
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
    throw new ProgressReportSignOffError("Supervisor profile not found.", 404);
  }

  return supervisor;
}

async function requireProgressReport(
  reportId: string,
): Promise<ProgressReportSignOffRecord> {
  const report = await prisma.progressReport.findUnique({
    where: {
      id: reportId,
    },
    select: {
      id: true,
      studentId: true,
      periodLabel: true,
      isSupervisorSignedOff: true,
      supervisorSignedOffAt: true,
      student: {
        select: {
          id: true,
          user: {
            select: {
              displayName: true,
            },
          },
          supervisorAssignments: {
            select: {
              supervisorId: true,
              isPrimary: true,
            },
          },
        },
      },
    },
  });

  if (!report) {
    throw new ProgressReportSignOffError("Progress report not found.", 404);
  }

  return report;
}

function assertAssignedPrimarySupervisor(
  report: ProgressReportSignOffRecord,
  supervisorId: string,
) {
  const isPrimarySupervisor = report.student.supervisorAssignments.some(
    (assignment) =>
      assignment.supervisorId === supervisorId && assignment.isPrimary,
  );

  if (!isPrimarySupervisor) {
    throw new ProgressReportSignOffError(
      "Only the assigned primary supervisor can sign off this progress report.",
      403,
    );
  }
}

function assertNotAlreadySignedOff(report: ProgressReportSignOffRecord) {
  if (report.isSupervisorSignedOff) {
    throw new ProgressReportSignOffError(
      "This progress report has already been signed off.",
      409,
    );
  }
}

export async function forwardProgressReportToPanel(input: {
  report: Pick<ProgressReportSignOffRecord, "id"> & {
    isSupervisorSignedOff: boolean;
  };
  supervisorName: string;
}) {
  if (!input.report.isSupervisorSignedOff) {
    throw new ProgressReportSignOffError(
      "Progress reports can only be forwarded after supervisor sign-off.",
      409,
    );
  }

  return forwardSignedOffProgressReportToPanel({
    progressReportId: input.report.id,
    supervisorName: input.supervisorName,
  });
}

export async function signOffProgressReport(
  input: { id: string },
  auth: AuthenticatedUserContext,
) {
  const parsed = signOffProgressReportSchema.safeParse(input);

  if (!parsed.success) {
    throw new ProgressReportSignOffError(
      parsed.error.issues[0]?.message ?? "Invalid progress report sign-off payload.",
      400,
    );
  }

  const [supervisor, report] = await Promise.all([
    requireSupervisorContext(auth),
    requireProgressReport(parsed.data.id),
  ]);

  assertAssignedPrimarySupervisor(report, supervisor.id);
  assertNotAlreadySignedOff(report);

  const signedOffAt = new Date();
  const updatedReport = await prisma.progressReport.update({
    where: {
      id: report.id,
    },
    data: {
      isSupervisorSignedOff: true,
      supervisorSignedOffAt: signedOffAt,
      supervisorSignedOffById: supervisor.id,
      isOverdue: false,
    },
    select: {
      id: true,
      studentId: true,
      periodLabel: true,
      isSupervisorSignedOff: true,
      supervisorSignedOffAt: true,
      supervisorSignedOffById: true,
    },
  });

  const forwarding = await forwardProgressReportToPanel({
    report: {
      id: report.id,
      isSupervisorSignedOff: true,
    },
    supervisorName: supervisor.user.displayName,
  });

  return {
    report: updatedReport,
    ...forwarding,
  };
}
