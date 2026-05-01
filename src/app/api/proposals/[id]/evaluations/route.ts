import { NextResponse, type NextRequest } from "next/server";
import { submitEvaluation } from "@/lib/proposals/evaluations";
import { ProposalSubmissionError } from "@/lib/proposals/submission";
import { withAuth, type WithAuthContext } from "@/lib/firebase/with-auth";
import { UserRole } from "@prisma/client";

export const POST = withAuth(
  async (request: NextRequest, context: WithAuthContext<{ id: string }>) => {
    try {
      const proposalId = context.params!.id;
      const body = await request.json();
      
      const result = await submitEvaluation(proposalId, body, context.auth.userId);

      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      if (error instanceof ProposalSubmissionError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      console.error("Evaluation submission error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
  [UserRole.SUPERVISOR]
);
