import { NextResponse } from "next/server";

import { markOverdueProgressReports } from "@/lib/progress-reports/maintenance";
import { runRegistrationMaintenance } from "@/lib/registrations";

function isAuthorizedCronRequest(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    return true;
  }

  const providedSecret = request.headers.get("x-cron-secret");
  return providedSecret === expectedSecret;
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
  }

  const [registrationMaintenance, overdueProgressReports] = await Promise.all([
    runRegistrationMaintenance(),
    markOverdueProgressReports(),
  ]);

  return NextResponse.json({
    ok: true,
    ...registrationMaintenance,
    overdueProgressReports,
  });
}
