import { NextResponse, type NextRequest } from "next/server";
import { createProposalUploadUrl, ProposalSubmissionError } from "@/lib/proposals/submission";
import { withAuth } from "@/lib/firebase/with-auth";
import { UserRole } from "@prisma/client";

export const POST = withAuth(
  async (request: NextRequest, context) => {
    try {
      const body = await request.json();
      const result = await createProposalUploadUrl(body, context.auth.userId, context.auth.role);

      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      if (error instanceof ProposalSubmissionError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      console.error("Proposal upload URL error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
  [UserRole.STUDENT, UserRole.ADMINISTRATOR]
);
