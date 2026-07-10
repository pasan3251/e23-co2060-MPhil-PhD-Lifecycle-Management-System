import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import {
  EthicsApprovalError,
  listEthicsApprovals,
} from "@/lib/ethics/approvals";
import { withAuth } from "@/lib/firebase/with-auth";

export const GET = withAuth(
  async (_request: NextRequest) => {
    try {
      const approvals = await listEthicsApprovals();

      return NextResponse.json({ approvals });
    } catch (error) {
      if (error instanceof EthicsApprovalError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Unable to load ethics approval records." },
        { status: 500 },
      );
    }
  },
  [UserRole.ADMINISTRATOR],
);
