import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import {
  assertStudentHasActiveRegistration,
  RegistrationError,
} from "@/lib/registrations";
import { withAuth } from "@/lib/firebase/with-auth";

export const GET = withAuth(
  async (_request: NextRequest, context) => {
    try {
      await assertStudentHasActiveRegistration(context.auth);

      return NextResponse.json({
        ok: true,
        message: "Progress report access granted.",
      });
    } catch (error) {
      if (error instanceof RegistrationError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Unable to validate registration access." },
        { status: 500 },
      );
    }
  },
  [UserRole.STUDENT],
);
