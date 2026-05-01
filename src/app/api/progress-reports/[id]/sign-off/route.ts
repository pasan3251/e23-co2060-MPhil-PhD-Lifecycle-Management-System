import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { withAuth } from "@/lib/firebase/with-auth";
import {
  ProgressReportSignOffError,
  signOffProgressReport,
} from "@/lib/progress-reports/sign-off";

type RouteParams = {
  id: string;
};

export const PATCH = withAuth<RouteParams>(
  async (_request: NextRequest, context) => {
    try {
      const result = await signOffProgressReport(
        { id: context.params.id },
        context.auth,
      );

      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof ProgressReportSignOffError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Unable to sign off the progress report." },
        { status: 500 },
      );
    }
  },
  [UserRole.SUPERVISOR],
);
