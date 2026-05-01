import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { withAuth } from "@/lib/firebase/with-auth";
import { getReviewPanelById, ReviewPanelError } from "@/lib/review-panels";

type RouteParams = {
  id: string;
};

export const GET = withAuth<RouteParams>(async (_request: NextRequest, context) => {
  const reviewPanelId = context.params?.id;

  if (!reviewPanelId) {
    return NextResponse.json({ error: "Review panel id is required." }, { status: 400 });
  }

  try {
    const panel = await getReviewPanelById(reviewPanelId, context.auth);

    return NextResponse.json({ panel });
  } catch (error) {
    if (error instanceof ReviewPanelError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Unable to load the review panel." },
      { status: 500 },
    );
  }
}, [UserRole.ADMINISTRATOR, UserRole.SUPERVISOR]);
