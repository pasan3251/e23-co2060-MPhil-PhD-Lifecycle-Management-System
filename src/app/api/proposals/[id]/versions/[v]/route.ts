import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { withAuth } from "@/lib/firebase/with-auth";

type RouteParams = {
  id: string;
  v: string;
};

export const DELETE = withAuth<RouteParams>(
  async (
    _request: NextRequest,
    _context,
  ) => {
    return NextResponse.json(
      { error: "Proposal document deletion is not implemented in this workflow." },
      { status: 501 },
    );
  },
  [UserRole.ADMINISTRATOR],
);
