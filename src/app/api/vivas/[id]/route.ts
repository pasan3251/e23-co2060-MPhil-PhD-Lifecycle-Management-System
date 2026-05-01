import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { withAuth } from "@/lib/firebase/with-auth";
import { getAdminVivaDetails, getExaminerVivaWorkspace, VivaWorkflowError } from "@/lib/vivas";

type RouteParams = {
  id: string;
};

export const GET = withAuth<RouteParams>(
  async (_request: NextRequest, context) => {
    try {
      if (context.auth.role === UserRole.ADMINISTRATOR) {
        const payload = await getAdminVivaDetails(
          context.params?.id ?? "",
          context.auth,
        );
        return NextResponse.json(payload);
      }

      const payload = await getExaminerVivaWorkspace(
        context.params?.id ?? "",
        context.auth,
      );

      return NextResponse.json(payload);
    } catch (error) {
      if (error instanceof VivaWorkflowError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Unable to load the viva workspace." },
        { status: 500 },
      );
    }
  },
  [UserRole.EXAMINER, UserRole.ADMINISTRATOR],
);
