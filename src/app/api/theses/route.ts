import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { withAuth } from "@/lib/firebase/with-auth";
import { submitThesis, ThesisSubmissionError } from "@/lib/theses/submission";

export const POST = withAuth(
  async (request: NextRequest, context) => {
    const body = await request.json();

    try {
      const payload = await submitThesis(body, context.auth);

      return NextResponse.json(payload, { status: 201 });
    } catch (error) {
      if (error instanceof ThesisSubmissionError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Unable to submit the thesis manuscript." },
        { status: 500 },
      );
    }
  },
  [UserRole.STUDENT],
);
