import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import {
  AdminProgressMonitoringError,
  listStudentsUnderReview,
} from "@/lib/admin/progress-monitoring";
import { withAuth } from "@/lib/firebase/with-auth";

export const GET = withAuth(async (_request: NextRequest) => {
  try {
    const students = await listStudentsUnderReview();
    return NextResponse.json({ students });
  } catch (error) {
    if (error instanceof AdminProgressMonitoringError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Unable to load students under review." },
      { status: 500 },
    );
  }
}, [UserRole.ADMINISTRATOR]);
