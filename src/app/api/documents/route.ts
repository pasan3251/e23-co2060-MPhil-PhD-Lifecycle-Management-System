import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import {
  DocumentRepositoryError,
  searchDocuments,
} from "@/lib/documents";
import { withAuth } from "@/lib/firebase/with-auth";

export const GET = withAuth(async (request: NextRequest, { auth }) => {
  const { searchParams } = request.nextUrl;

  const query = {
    q: searchParams.get("q") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    tag: searchParams.get("tag") ?? undefined,
    startDate: searchParams.get("startDate") ?? undefined,
    endDate: searchParams.get("endDate") ?? undefined,
    page: searchParams.get("page") ? Number(searchParams.get("page")) : 1,
    limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : 50,
  };

  try {
    const documents = await searchDocuments(query, auth);
    return NextResponse.json({ documents });
  } catch (error) {
    if (error instanceof DocumentRepositoryError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Unable to retrieve documents." },
      { status: 500 },
    );
  }
}, [
  UserRole.STUDENT,
  UserRole.SUPERVISOR,
  UserRole.EXAMINER,
  UserRole.ADMINISTRATOR,
]);
