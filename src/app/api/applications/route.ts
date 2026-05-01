import { NextResponse } from "next/server";

import {
  ApplicationSubmissionError,
  createApplicationSubmission,
} from "@/lib/applications/submission";
import { createServerErrorResponse } from "@/lib/http/errors";

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const application = await createApplicationSubmission(body);

    return NextResponse.json(
      {
        application: {
          id: application.id,
          status: application.status,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ApplicationSubmissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return createServerErrorResponse({
      error,
      message: "Unable to submit the application.",
      route: "/api/applications",
      method: "POST",
    });
  }
}
