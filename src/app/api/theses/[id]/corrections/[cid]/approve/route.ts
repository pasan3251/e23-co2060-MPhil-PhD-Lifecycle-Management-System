import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { withAuth } from "@/lib/firebase/with-auth";
import {
  approveCorrectionDocument,
  ThesisCorrectionError,
} from "@/lib/theses/corrections";

type RouteParams = {
  id: string;
  cid: string;
};

export const PATCH = withAuth<RouteParams>(
  async (_request: NextRequest, context) => {
    try {
      const correction = await approveCorrectionDocument(
        context.params?.id ?? "",
        context.params?.cid ?? "",
        context.auth,
      );

      return NextResponse.json({ correction });
    } catch (error) {
      if (error instanceof ThesisCorrectionError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Unable to approve the correction document." },
        { status: 500 },
      );
    }
  },
  [UserRole.ADMINISTRATOR],
);
