import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { withAuth } from "@/lib/firebase/with-auth";
import {
  getStudentProposalOverview,
  ProposalSubmissionError,
  submitResearchProposal,
} from "@/lib/proposals/submission";

export const GET = withAuth(
  async (_request: NextRequest, context) => {
    try {
      const overview = await getStudentProposalOverview(context.auth);

      return NextResponse.json(overview);
    } catch (error) {
      if (error instanceof ProposalSubmissionError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Unable to load the research proposal workspace." },
        { status: 500 },
      );
    }
  },
  [UserRole.STUDENT],
);

export const POST = withAuth(
  async (request: NextRequest, context) => {
    const body = await request.json();

    try {
      const proposal = await submitResearchProposal(body, context.auth);

      return NextResponse.json({ proposal }, { status: 201 });
    } catch (error) {
      if (error instanceof ProposalSubmissionError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Unable to submit the research proposal." },
        { status: 500 },
      );
    }
  },
  [UserRole.STUDENT],
);
