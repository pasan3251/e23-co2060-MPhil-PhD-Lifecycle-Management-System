import { NextResponse } from "next/server";

import { captureServerException } from "@/lib/monitoring/sentry";

export async function createServerErrorResponse(input: {
  error: unknown;
  message: string;
  route: string;
  method: string;
  userId?: string | null;
  role?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await captureServerException(input.error, {
    route: input.route,
    method: input.method,
    userId: input.userId,
    role: input.role,
    status: 500,
    metadata: input.metadata,
  });

  return NextResponse.json({ error: input.message }, { status: 500 });
}
