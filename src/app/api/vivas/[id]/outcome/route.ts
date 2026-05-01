import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { withAuth } from "@/lib/firebase/with-auth";
import { recordVivaOutcome, VivaWorkflowError } from "@/lib/vivas";

type RouteParams = {
  id: string;
};

export const POST = withAuth<RouteParams>(
  async (request: NextRequest, context) => {
    const body = await request.json();

    try {
      const payload = await recordVivaOutcome(
        context.params?.id ?? "",
        {
          outcome: body.outcome,
        },
        context.auth,
      );

      return NextResponse.json(payload, { status: 201 });
    } catch (error) {
      if (error instanceof VivaWorkflowError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Unable to record the viva outcome." },
        { status: 500 },
      );
    }
  },
  [UserRole.EXAMINER],
);
