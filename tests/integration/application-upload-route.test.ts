import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/applications/submission", () => ({
  ApplicationSubmissionError: class ApplicationSubmissionError extends Error {
    status: number;

    constructor(message: string, status = 400) {
      super(message);
      this.status = status;
    }
  },
  uploadApplicationDocument: vi.fn(),
}));

import { POST } from "@/app/api/applications/upload/route";
import {
  ApplicationSubmissionError,
  uploadApplicationDocument,
} from "@/lib/applications/submission";

describe("application upload route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads a supporting document through the server route", async () => {
    vi.mocked(uploadApplicationDocument).mockResolvedValue({
      storagePath: "applications/application-1/cv.pdf",
      fileName: "cv.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
    });

    const formData = new FormData();
    formData.append("draftId", "application-1");
    formData.append("file", new File(["pdf"], "cv.pdf", { type: "application/pdf" }));

    const response = await POST(
      new Request("http://localhost/api/applications/upload", {
        method: "POST",
        body: formData,
      }),
    );

    expect(response.status).toBe(201);
    expect(uploadApplicationDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        draftId: "application-1",
      }),
    );
  });

  it("returns the application submission status when validation fails", async () => {
    vi.mocked(uploadApplicationDocument).mockRejectedValue(
      new ApplicationSubmissionError("Only PDF documents are allowed.", 400),
    );

    const formData = new FormData();
    formData.append("draftId", "application-1");
    formData.append("file", new File(["text"], "notes.txt", { type: "text/plain" }));

    const response = await POST(
      new Request("http://localhost/api/applications/upload", {
        method: "POST",
        body: formData,
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Only PDF documents are allowed.",
    });
  });
});
