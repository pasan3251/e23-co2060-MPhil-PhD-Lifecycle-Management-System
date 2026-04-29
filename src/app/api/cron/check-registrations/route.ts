import { NextResponse } from "next/server";

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

  const result = await runRegistrationMaintenance();

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
