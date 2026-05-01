import { NextResponse, type NextRequest } from "next/server";
import { getProposalVersions, AccessError } from "@/lib/proposals/versions";
import { withAuth, type WithAuthContext } from "@/lib/firebase/with-auth";

export const GET = withAuth(
  async (request: NextRequest, context: WithAuthContext<{ id: string }>) => {
    try {
      const versions = await getProposalVersions(context.params!.id, context.auth.userId, context.auth.role);
      return NextResponse.json(versions, { status: 200 });
    } catch (error) {
      if (error instanceof AccessError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }
);
