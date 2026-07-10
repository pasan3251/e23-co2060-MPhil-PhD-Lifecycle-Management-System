import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { withAuth } from "@/lib/firebase/with-auth";
import {
  ProgressReportSignOffError,
  signOffProgressReport,
} from "@/lib/progress-reports/sign-off";

type Params = {
  id: string;
};

export const POST = withAuth<Params>(
  async (_request: NextRequest, context) => {
    const progressReportId = context.params?.id;

    if (!progressReportId) {
      return NextResponse.json({ error: "Progress report id is required." }, { status: 400 });
    }

    try {
      await signOffProgressReport(
        { id: progressReportId },
        context.auth,
      );

      return NextResponse.json({ ok: true });
    } catch (error) {
      if (error instanceof ProgressReportSignOffError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Progress-report sign-off is no longer available." },
        { status: 500 },
      );
    }
  },
  [UserRole.SUPERVISOR, UserRole.ADMINISTRATOR],
);
