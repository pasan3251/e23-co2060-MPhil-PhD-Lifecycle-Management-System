import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { withAuth } from "@/lib/firebase/with-auth";
import { getThesisVersions, ThesisVersionError } from "@/lib/theses/versions";

type RouteParams = {
  id: string;
};

export const GET = withAuth<RouteParams>(
  async (_request: NextRequest, context) => {
    try {
      const payload = await getThesisVersions(context.params?.id ?? "", context.auth);

      return NextResponse.json(payload);
    } catch (error) {
      if (error instanceof ThesisVersionError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Unable to load thesis version history." },
        { status: 500 },
      );
    }
  },
  [UserRole.STUDENT, UserRole.ADMINISTRATOR, UserRole.EXAMINER, UserRole.SUPERVISOR],
);
