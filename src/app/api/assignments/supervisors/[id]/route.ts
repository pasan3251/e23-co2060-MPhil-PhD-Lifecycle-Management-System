import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import {
  removeSupervisorFromStudent,
  setPrimarySupervisorAssignment,
  SupervisorAssignmentError,
} from "@/lib/assignments/supervisors";
import { withAuth } from "@/lib/firebase/with-auth";

type RouteParams = {
  id: string;
};

export const DELETE = withAuth<RouteParams>(
  async (request: NextRequest, context) => {
    const assignmentId = context.params?.id;

    if (!assignmentId) {
      return NextResponse.json(
        { error: "Assignment ID is required." },
        { status: 400 },
      );
    }

    try {
      const result = await removeSupervisorFromStudent(assignmentId, context.auth);

      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof SupervisorAssignmentError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Unable to remove the supervisor assignment." },
        { status: 500 },
      );
    }
  },
  [UserRole.ADMINISTRATOR],
);

export const PATCH = withAuth<RouteParams>(
  async (_request: NextRequest, context) => {
    const assignmentId = context.params?.id;

    if (!assignmentId) {
      return NextResponse.json(
        { error: "Assignment ID is required." },
        { status: 400 },
      );
    }

    try {
      const assignment = await setPrimarySupervisorAssignment(
        assignmentId,
        context.auth,
      );

      return NextResponse.json({ assignment });
    } catch (error) {
      if (error instanceof SupervisorAssignmentError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Unable to update the supervisor assignment." },
        { status: 500 },
      );
    }
  },
  [UserRole.ADMINISTRATOR],
);
