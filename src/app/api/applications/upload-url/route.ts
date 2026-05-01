import { NextResponse } from "next/server";

import {
  ApplicationSubmissionError,
  createApplicationUploadUrl,
} from "@/lib/applications/submission";

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const uploadTarget = await createApplicationUploadUrl(body);

    return NextResponse.json(uploadTarget, { status: 201 });
  } catch (error) {
    if (error instanceof ApplicationSubmissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Unable to prepare the document upload." },
      { status: 500 },
    );
  }
}
