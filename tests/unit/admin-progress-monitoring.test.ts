import { ProgramType } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    progressReport: {
      findMany: vi.fn(),
    },
  },
}));

import {
  buildOverdueProgressCsv,
  getOverdueProgressReportRows,
  parseOverdueProgressFilters,
} from "@/lib/admin/progress-monitoring";
import { prisma } from "@/lib/prisma/client";

describe("admin progress monitoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries only reports flagged as overdue", async () => {
    vi.mocked(prisma.progressReport.findMany).mockResolvedValue([] as never);

    const filters = parseOverdueProgressFilters({
      programType: ProgramType.MPHIL,
      supervisorId: "supervisor-1",
    });

    await getOverdueProgressReportRows(filters, new Date("2026-05-01T00:00:00.000Z"));

    expect(prisma.progressReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isOverdue: true,
          isArchived: false,
          student: expect.objectContaining({
            programType: ProgramType.MPHIL,
            supervisorAssignments: expect.objectContaining({
              some: expect.objectContaining({
                supervisorId: "supervisor-1",
                isPrimary: true,
              }),
            }),
          }),
        }),
      }),
    );
  });

  it("builds csv output with the expected headers and row mapping", () => {
    const csv = buildOverdueProgressCsv([
      {
        reportId: "report-1",
        studentId: "student-1",
        studentName: "Student One",
        programType: ProgramType.PHD,
        periodLabel: "2026 Q1",
        daysOverdue: 14,
        supervisorId: "supervisor-1",
        supervisorName: "Dr. Primary",
        updatedAt: new Date("2026-04-17T00:00:00.000Z"),
      },
    ]);

    expect(csv).toContain("Student Name,Period,Days Overdue,Supervisor Name");
    expect(csv).toContain("Student One,2026 Q1,14,Dr. Primary");
  });
});
