import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { withAuth } from "@/lib/firebase/with-auth";
import {
  assignExaminerToProgressReport,
  ProgressReportReviewError,
} from "@/lib/progress-reports/reviews";

type RouteParams = {
  id: string;
};

export const POST = withAuth<RouteParams>(
  async (request: NextRequest, context) => {
    const progressReportId = context.params?.id;

    if (!progressReportId) {
      return NextResponse.json({ error: "Progress report id is required." }, { status: 400 });
    }

    const body = await request.json();

    try {
      const review = await assignExaminerToProgressReport(
        {
          progressReportId,
          examinerId: body.examinerId,
        },
        context.auth,
      );

      return NextResponse.json({ review }, { status: 201 });
    } catch (error) {
      if (error instanceof ProgressReportReviewError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Unable to assign examiner to progress report." },
        { status: 500 },
      );
    }
  },
  [UserRole.ADMINISTRATOR],
);
