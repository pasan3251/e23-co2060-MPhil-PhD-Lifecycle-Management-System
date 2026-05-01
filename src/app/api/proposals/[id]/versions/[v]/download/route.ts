import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { withAuth } from "@/lib/firebase/with-auth";
import {
  getProposalVersionDownloadUrl,
  ProposalVersionError,
} from "@/lib/proposals/versions";

type RouteParams = {
  id: string;
  v: string;
};

export const GET = withAuth<RouteParams>(
  async (_request: NextRequest, context) => {
    const version = Number(context.params?.v ?? "");

    try {
      const payload = await getProposalVersionDownloadUrl(
        context.params?.id ?? "",
        version,
        context.auth,
      );

      return NextResponse.json(payload);
    } catch (error) {
      if (error instanceof ProposalVersionError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Unable to create the proposal download URL." },
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
