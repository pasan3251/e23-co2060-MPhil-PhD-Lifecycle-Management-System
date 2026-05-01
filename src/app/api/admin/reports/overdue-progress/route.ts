import { UserRole } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import {
  AdminProgressMonitoringError,
  buildOverdueProgressCsv,
  getOverdueProgressReportRows,
  listOverdueProgressReports,
  parseOverdueProgressFilters,
} from "@/lib/admin/progress-monitoring";
import { withAuth } from "@/lib/firebase/with-auth";

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const filters = parseOverdueProgressFilters({
      from: request.nextUrl.searchParams.get("from") ?? undefined,
      to: request.nextUrl.searchParams.get("to") ?? undefined,
      programType: request.nextUrl.searchParams.get("programType") ?? undefined,
      supervisorId: request.nextUrl.searchParams.get("supervisor") ?? undefined,
      format: request.nextUrl.searchParams.get("format") ?? undefined,
      page: request.nextUrl.searchParams.get("page")
        ? Number(request.nextUrl.searchParams.get("page"))
        : undefined,
      limit: request.nextUrl.searchParams.get("limit")
        ? Number(request.nextUrl.searchParams.get("limit"))
        : undefined,
    });

    if (filters.format === "csv") {
      const rows = await getOverdueProgressReportRows(filters);
      const csv = buildOverdueProgressCsv(rows);

      return new Response(csv, {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": 'attachment; filename="overdue-progress-reports.csv"',
        },
      });
    }

    const result = await listOverdueProgressReports(filters);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminProgressMonitoringError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Unable to load overdue progress reports." },
      { status: 500 },
    );
  }
}, [UserRole.ADMINISTRATOR]);
