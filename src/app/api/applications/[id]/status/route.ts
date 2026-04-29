import { ApplicationStatus, UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  ApplicationSubmissionError,
  updateApplicationStatus,
} from "@/lib/applications/submission";
import { withAuth } from "@/lib/firebase/with-auth";

const applicationStatusUpdateSchema = z.object({
  status: z.enum([
    ApplicationStatus.SUBMITTED,
    ApplicationStatus.UNDER_REVIEW,
    ApplicationStatus.ADMITTED,
    ApplicationStatus.REJECTED,
  ]),
});

type RouteParams = {
  id: string;
};

export const PATCH = withAuth<RouteParams>(
  async (request: NextRequest, context) => {
    const body = await request.json();
    const parsed = applicationStatusUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid status payload." },
        { status: 400 },
      );
    }

    try {
      const application = await updateApplicationStatus(
        context.params?.id ?? "",
        parsed.data.status,
      );

      return NextResponse.json({
        application: {
          id: application.id,
          status: application.status,
        },
      });
    } catch (error) {
      if (error instanceof ApplicationSubmissionError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Unable to update application status." },
        { status: 500 },
      );
    }
  },
  [UserRole.ADMINISTRATOR],
);
