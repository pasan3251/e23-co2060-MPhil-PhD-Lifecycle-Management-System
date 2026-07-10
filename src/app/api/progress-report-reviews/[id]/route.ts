import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { withAuth } from "@/lib/firebase/with-auth";
import {
  ProgressReportReviewError,
  releaseProgressReportReview,
  submitProgressReportReview,
} from "@/lib/progress-reports/reviews";

type RouteParams = {
  id: string;
};

export const POST = withAuth<RouteParams>(
  async (request: NextRequest, context) => {
    const reviewId = context.params?.id;

    if (!reviewId) {
      return NextResponse.json({ error: "Review id is required." }, { status: 400 });
    }

    const body = await request.json();

    try {
      const review = await submitProgressReportReview(
        reviewId,
        body,
        context.auth,
      );

      return NextResponse.json({ review });
    } catch (error) {
      if (error instanceof ProgressReportReviewError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Unable to submit progress report review." },
        { status: 500 },
      );
    }
  },
  [UserRole.EXAMINER],
);

export const PATCH = withAuth<RouteParams>(
  async (request: NextRequest, context) => {
    const reviewId = context.params?.id;

    if (!reviewId) {
      return NextResponse.json({ error: "Review id is required." }, { status: 400 });
    }

    const body = await request.json();

    try {
      const review = await releaseProgressReportReview(
        reviewId,
        body,
        context.auth,
      );

      return NextResponse.json({ review });
    } catch (error) {
      if (error instanceof ProgressReportReviewError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Unable to release progress report review." },
        { status: 500 },
      );
    }
  },
  [UserRole.ADMINISTRATOR],
);
