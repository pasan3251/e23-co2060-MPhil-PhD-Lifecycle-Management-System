import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { withAuth } from "@/lib/firebase/with-auth";
import {
  getSupervisorAssignedStudents,
  parseSupervisorStudentFilters,
  SupervisorStudentsError,
} from "@/lib/supervisor/students";

export const GET = withAuth(async (request: NextRequest, context) => {
  try {
    const filters = parseSupervisorStudentFilters({
      programType: request.nextUrl.searchParams.get("programType") ?? undefined,
      registrationStatus:
        request.nextUrl.searchParams.get("registrationStatus") ?? undefined,
    });
    const students = await getSupervisorAssignedStudents(context.auth, filters);

    return NextResponse.json({ students });
  } catch (error) {
    console.error("[SupervisorStudentsAPI]", error);
    if (error instanceof SupervisorStudentsError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Unable to load supervisor students." },
      { status: 500 },
    );
  }
}, [UserRole.SUPERVISOR]);
