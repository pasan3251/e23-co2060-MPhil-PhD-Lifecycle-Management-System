import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { withAuth } from "@/lib/firebase/with-auth";
import {
  getStudentProfileById,
  parseRestrictedStudentProfileInput,
  StudentProfileError,
  updateStudentProfileById,
} from "@/lib/students/profile";

export const GET = withAuth(
  async (_request: NextRequest, context) => {
    try {
      const student = await getStudentProfileById(context.params?.id ?? "", context.auth);

      return NextResponse.json({ student });
    } catch (error) {
      if (error instanceof StudentProfileError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Unable to load student profile." },
        { status: 500 },
      );
    }
  },
  [UserRole.STUDENT, UserRole.SUPERVISOR, UserRole.ADMINISTRATOR],
);

export const PATCH = withAuth(
  async (request: NextRequest, context) => {
    try {
      const payload = parseRestrictedStudentProfileInput(await request.json());
      const student = await updateStudentProfileById(
        context.params?.id ?? "",
        payload,
        context.auth,
      );

      return NextResponse.json({ student });
    } catch (error) {
      if (error instanceof StudentProfileError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Unable to update student profile." },
        { status: 500 },
      );
    }
  },
  [UserRole.STUDENT, UserRole.SUPERVISOR, UserRole.ADMINISTRATOR],
);
