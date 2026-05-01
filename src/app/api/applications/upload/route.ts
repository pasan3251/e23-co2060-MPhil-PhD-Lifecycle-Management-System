import { NextResponse } from "next/server";

import {
  ApplicationSubmissionError,
  uploadApplicationDocument,
} from "@/lib/applications/submission";

export async function POST(request: Request) {
  const formData = await request.formData();
  const draftId = formData.get("draftId");
  const file = formData.get("file");

  try {
    const uploadedDocument = await uploadApplicationDocument({
      draftId: typeof draftId === "string" ? draftId : "",
      file,
    });

    return NextResponse.json(uploadedDocument, { status: 201 });
  } catch (error) {
    if (error instanceof ApplicationSubmissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Unable to upload the document." },
      { status: 500 },
    );
  }
}
