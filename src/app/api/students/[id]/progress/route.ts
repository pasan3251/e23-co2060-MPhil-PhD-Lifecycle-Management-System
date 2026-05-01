import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { withAuth } from "@/lib/firebase/with-auth";
import {
  getStudentProgressById,
  StudentProgressError,
} from "@/lib/students/progress";

export const GET = withAuth(
  async (_request: NextRequest, context) => {
    try {
      const progress = await getStudentProgressById(
        context.params?.id ?? "",
        context.auth,
      );

      return NextResponse.json({ progress });
    } catch (error) {
      if (error instanceof StudentProgressError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Unable to load student progress." },
        { status: 500 },
      );
    }
  },
  [UserRole.STUDENT],
);
