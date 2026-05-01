import { PanelEvaluationOutcome, UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { withAuth } from "@/lib/firebase/with-auth";
import { ReviewPanelError, submitPanelEvaluation } from "@/lib/review-panels";

type RouteParams = {
  id: string;
};

export const POST = withAuth<RouteParams>(async (request: NextRequest, context) => {
  const body = await request.json();

  try {
    const result = await submitPanelEvaluation(
      {
        progressReportId: context.params.id,
        numericalScore: body.numericalScore,
        outcome: body.outcome as PanelEvaluationOutcome,
        notes: body.notes,
      },
      context.auth,
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ReviewPanelError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Unable to submit the panel evaluation." },
      { status: 500 },
    );
  }
}, [UserRole.SUPERVISOR]);
