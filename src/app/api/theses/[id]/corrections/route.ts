import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { withAuth } from "@/lib/firebase/with-auth";
import {
  listThesisCorrections,
  submitCorrectionDocument,
  ThesisCorrectionError,
} from "@/lib/theses/corrections";

type RouteParams = {
  id: string;
};

export const GET = withAuth<RouteParams>(
  async (_request: NextRequest, context) => {
    try {
      const corrections = await listThesisCorrections(
        context.params?.id ?? "",
        context.auth,
      );

      return NextResponse.json({ corrections });
    } catch (error) {
      if (error instanceof ThesisCorrectionError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Unable to load thesis corrections." },
        { status: 500 },
      );
    }
  },
  [UserRole.ADMINISTRATOR],
);

export const POST = withAuth<RouteParams>(
  async (request: NextRequest, context) => {
    const body = await request.json();

    try {
      const payload = await submitCorrectionDocument(
        context.params?.id ?? "",
        body,
        context.auth,
      );

      return NextResponse.json(payload, { status: 201 });
    } catch (error) {
      if (error instanceof ThesisCorrectionError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Unable to submit the correction document." },
        { status: 500 },
      );
    }
  },
  [UserRole.STUDENT],
);
