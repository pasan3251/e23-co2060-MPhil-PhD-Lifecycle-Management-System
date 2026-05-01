import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { withAuth } from "@/lib/firebase/with-auth";
import { createReviewPanel, ReviewPanelError } from "@/lib/review-panels";

export const POST = withAuth(async (request: NextRequest, context) => {
  const body = await request.json();

  try {
    const result = await createReviewPanel(body, context.auth);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ReviewPanelError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Unable to create the review panel." },
      { status: 500 },
    );
  }
}, [UserRole.ADMINISTRATOR]);
