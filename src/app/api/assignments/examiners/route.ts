import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import {
  assignExaminerToThesis,
  ExaminerAssignmentError,
} from "@/lib/assignments/examiners";
import { withAuth } from "@/lib/firebase/with-auth";

export const POST = withAuth(async (request: NextRequest, context) => {
  const body = await request.json();

  try {
    const payload = await assignExaminerToThesis(body, context.auth);

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    if (error instanceof ExaminerAssignmentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Unable to assign the examiner." },
      { status: 500 },
    );
  }
}, [UserRole.ADMINISTRATOR]);
