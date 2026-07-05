import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import {
  assertStudentHasActiveRegistration,
  RegistrationError,
} from "@/lib/registrations";
import { withAuth } from "@/lib/firebase/with-auth";
import { prisma } from "@/lib/prisma/client";
import {
  ProgressReportSubmissionError,
  submitProgressReport,
} from "@/lib/progress-reports/submission";

export const GET = withAuth(
  async (_request: NextRequest, context) => {
    try {
      await assertStudentHasActiveRegistration(context.auth);

      const student = await prisma.student.findUnique({
        where: { userId: context.auth.userId },
        select: { id: true },
      });

      if (!student) {
        return NextResponse.json({ error: "Student profile not found." }, { status: 404 });
      }

      const reports = await prisma.progressReport.findMany({
        where: { studentId: student.id },
        orderBy: { createdAt: "desc" },
        include: {
          documents: {
            where: {
              isDeleted: false,
              documentType: "PROGRESS_REPORT",
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

      return NextResponse.json({
        ok: true,
        reports,
      });
    } catch (error) {
      if (error instanceof RegistrationError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Unable to load progress reports." },
        { status: 500 },
      );
    }
  },
  [UserRole.STUDENT],
);

export const POST = withAuth(
  async (request: NextRequest, context) => {
    try {
      const body = await request.json();
      const payload = await submitProgressReport(body, context.auth);

      return NextResponse.json({ ok: true, ...payload }, { status: 201 });
    } catch (error) {
      if (error instanceof ProgressReportSubmissionError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Unable to submit progress report." },
        { status: 500 },
      );
    }
  },
  [UserRole.STUDENT],
);
