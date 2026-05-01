import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { withAuth } from "@/lib/firebase/with-auth";
import {
  archiveThesisAfterCorrections,
  ThesisCorrectionError,
} from "@/lib/theses/corrections";

type RouteParams = {
  id: string;
};

export const PATCH = withAuth<RouteParams>(
  async (_request: NextRequest, context) => {
    try {
      const payload = await archiveThesisAfterCorrections(
        context.params?.id ?? "",
        context.auth,
      );

      return NextResponse.json(payload);
    } catch (error) {
      if (error instanceof ThesisCorrectionError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Unable to archive the thesis." },
        { status: 500 },
      );
    }
  },
  [UserRole.ADMINISTRATOR],
);
