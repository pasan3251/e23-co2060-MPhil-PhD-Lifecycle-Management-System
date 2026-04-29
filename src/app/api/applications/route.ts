import { NextResponse } from "next/server";

import {
  ApplicationSubmissionError,
  createApplicationSubmission,
} from "@/lib/applications/submission";

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

    return NextResponse.json(
      { error: "Unable to submit the application." },
      { status: 500 },
    );
  }
}
