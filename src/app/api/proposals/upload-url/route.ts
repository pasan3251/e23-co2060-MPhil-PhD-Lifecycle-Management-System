import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { withAuth } from "@/lib/firebase/with-auth";
import {
  createProposalUploadUrl,
  ProposalSubmissionError,
} from "@/lib/proposals/submission";

export const POST = withAuth(
  async (request: NextRequest, context) => {
    const body = await request.json();

    try {
      const uploadTarget = await createProposalUploadUrl(body, context.auth);

      return NextResponse.json(uploadTarget, { status: 201 });
    } catch (error) {
      if (error instanceof ProposalSubmissionError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Unable to prepare the proposal upload." },
        { status: 500 },
      );
    }
  },
  [UserRole.STUDENT],
);
