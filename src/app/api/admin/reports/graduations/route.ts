import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import {
  AdminSystemReportError,
  buildGraduationsCsv,
  listGraduationsReport,
  parseAdminReportFilters,
} from "@/lib/admin/system-reports";
import { withAuth } from "@/lib/firebase/with-auth";

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const filters = parseAdminReportFilters({
      from: request.nextUrl.searchParams.get("from") ?? undefined,
      to: request.nextUrl.searchParams.get("to") ?? undefined,
      programType: request.nextUrl.searchParams.get("programType") ?? undefined,
      format: request.nextUrl.searchParams.get("format") ?? undefined,
      page: request.nextUrl.searchParams.get("page")
        ? Number(request.nextUrl.searchParams.get("page"))
        : undefined,
      limit: request.nextUrl.searchParams.get("limit")
        ? Number(request.nextUrl.searchParams.get("limit"))
        : undefined,
    });

    const result = await listGraduationsReport(filters);

    if (filters.format === "csv") {
      const csv = buildGraduationsCsv(result.rows);
      return new Response(csv, {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": 'attachment; filename="graduations-report.csv"',
        },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminSystemReportError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Unable to load the graduations report." },
      { status: 500 },
    );
  }
}, [UserRole.ADMINISTRATOR]);
