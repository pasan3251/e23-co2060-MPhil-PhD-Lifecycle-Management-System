import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { archiveStudentRecord, ArchiveError } from "@/lib/admin/archive";
import { withAuth } from "@/lib/firebase/with-auth";

export const PATCH = withAuth(
  async (_request: NextRequest, context) => {
    try {
      const result = await archiveStudentRecord(context.params?.id ?? "", context.auth);
      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof ArchiveError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      return NextResponse.json(
        { error: "Unable to archive the student record." },
        { status: 500 },
      );
    }
  },
  [UserRole.ADMINISTRATOR],
);
