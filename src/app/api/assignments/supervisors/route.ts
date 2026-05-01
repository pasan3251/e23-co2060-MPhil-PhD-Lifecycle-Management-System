import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import {
  assignSupervisorToStudent,
  SupervisorAssignmentError,
} from "@/lib/assignments/supervisors";
import { withAuth } from "@/lib/firebase/with-auth";

export const POST = withAuth(async (request: NextRequest, context) => {
  const body = await request.json();

  try {
    const assignment = await assignSupervisorToStudent(body, context.auth);

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    if (error instanceof SupervisorAssignmentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Unable to assign the supervisor." },
      { status: 500 },
    );
  }
}, [UserRole.ADMINISTRATOR]);
