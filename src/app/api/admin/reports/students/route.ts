import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import {
  AdminSystemReportError,
  buildStudentReportCsv,
  listStudentReport,
  parseAdminReportFilters,
} from "@/lib/admin/system-reports";
import { withAuth } from "@/lib/firebase/with-auth";

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const filters = parseAdminReportFilters({
      from: request.nextUrl.searchParams.get("from") ?? undefined,
      to: request.nextUrl.searchParams.get("to") ?? undefined,
      programType: request.nextUrl.searchParams.get("programType") ?? undefined,
      status: request.nextUrl.searchParams.get("status") ?? undefined,
      supervisorId: request.nextUrl.searchParams.get("supervisor") ?? undefined,
      format: request.nextUrl.searchParams.get("format") ?? undefined,
      page: request.nextUrl.searchParams.get("page")
        ? Number(request.nextUrl.searchParams.get("page"))
        : undefined,
      limit: request.nextUrl.searchParams.get("limit")
        ? Number(request.nextUrl.searchParams.get("limit"))
        : undefined,
    });

    const result = await listStudentReport(filters);

    if (filters.format === "csv") {
      const csv = buildStudentReportCsv(result.rows);
      return new Response(csv, {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": 'attachment; filename="students-report.csv"',
        },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminSystemReportError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Unable to load the student report." },
      { status: 500 },
    );
  }
}, [UserRole.ADMINISTRATOR]);
