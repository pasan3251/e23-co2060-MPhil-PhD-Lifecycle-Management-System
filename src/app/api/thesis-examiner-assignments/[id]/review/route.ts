import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { withAuth } from "@/lib/firebase/with-auth";
import {
  releaseThesisExaminerReview,
  submitThesisExaminerReview,
  ThesisReviewError,
} from "@/lib/theses/reviews";

type RouteParams = {
  id: string;
};

export const POST = withAuth<RouteParams>(
  async (request: NextRequest, context) => {
    const assignmentId = context.params?.id;

    if (!assignmentId) {
      return NextResponse.json({ error: "Assignment id is required." }, { status: 400 });
    }

    const body = await request.json();

    try {
      const review = await submitThesisExaminerReview(
        assignmentId,
        body,
        context.auth,
      );

      return NextResponse.json({ review });
    } catch (error) {
      if (error instanceof ThesisReviewError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Unable to submit thesis review." },
        { status: 500 },
      );
    }
  },
  [UserRole.EXAMINER],
);

export const PATCH = withAuth<RouteParams>(
  async (request: NextRequest, context) => {
    const assignmentId = context.params?.id;

    if (!assignmentId) {
      return NextResponse.json({ error: "Assignment id is required." }, { status: 400 });
    }

    const body = await request.json();

    try {
      const review = await releaseThesisExaminerReview(
        assignmentId,
        body,
        context.auth,
      );

      return NextResponse.json({ review });
    } catch (error) {
      if (error instanceof ThesisReviewError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Unable to release thesis review." },
        { status: 500 },
      );
    }
  },
  [UserRole.ADMINISTRATOR],
);
