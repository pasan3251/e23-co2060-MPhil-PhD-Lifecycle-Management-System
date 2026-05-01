import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { withAuth } from "@/lib/firebase/with-auth";
import {
  getProposalVersions,
  ProposalVersionError,
} from "@/lib/proposals/versions";

type RouteParams = {
  id: string;
};

export const GET = withAuth<RouteParams>(
  async (_request: NextRequest, context) => {
    try {
      const payload = await getProposalVersions(
        context.params?.id ?? "",
        context.auth,
      );

      return NextResponse.json(payload);
    } catch (error) {
      if (error instanceof ProposalVersionError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Unable to load proposal version history." },
        { status: 500 },
      );
    }
  },
  [
    UserRole.STUDENT,
    UserRole.SUPERVISOR,
    UserRole.ADMINISTRATOR,
    UserRole.EXAMINER,
  ],
);
