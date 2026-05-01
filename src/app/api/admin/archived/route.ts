import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { listArchivedRecords } from "@/lib/admin/archive";
import { withAuth } from "@/lib/firebase/with-auth";

export const GET = withAuth(async (_request: NextRequest) => {
  try {
    const archived = await listArchivedRecords();
    return NextResponse.json(archived);
  } catch {
    return NextResponse.json(
      { error: "Unable to load archived records." },
      { status: 500 },
    );
  }
}, [UserRole.ADMINISTRATOR]);
