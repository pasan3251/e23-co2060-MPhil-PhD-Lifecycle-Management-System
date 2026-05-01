import { describe, it, expect } from "vitest";
import { proposalUploadRequestSchema } from "@/lib/proposals/schemas";

describe("Proposal Schemas (REQ-FN-004)", () => {
  it("should reject non-PDF file uploads", () => {
    const result = proposalUploadRequestSchema.safeParse({
      studentId: "student-123",
      fileName: "proposal.docx",
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileSizeBytes: 1024,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Only PDF documents are allowed.");
    }
  });

  it("should accept PDF file uploads", () => {
    const result = proposalUploadRequestSchema.safeParse({
      studentId: "student-123",
      fileName: "proposal.pdf",
      contentType: "application/pdf",
      fileSizeBytes: 1024,
    });

    expect(result.success).toBe(true);
  });
});

import { evaluationSubmissionSchema } from "@/lib/proposals/schemas";

describe("Evaluation Form Schema", () => {
  it("should reject scores outside the 0-100 range", () => {
    const tooLow = evaluationSubmissionSchema.safeParse({ score: -1, feedback: "A".repeat(50) });
    expect(tooLow.success).toBe(false);

    const tooHigh = evaluationSubmissionSchema.safeParse({ score: 101, feedback: "A".repeat(50) });
    expect(tooHigh.success).toBe(false);

    const valid = evaluationSubmissionSchema.safeParse({ score: 85, feedback: "A".repeat(50) });
    expect(valid.success).toBe(true);
  });

  it("should reject feedback shorter than 50 characters", () => {
    const tooShort = evaluationSubmissionSchema.safeParse({ score: 85, feedback: "Too short" });
    expect(tooShort.success).toBe(false);
  });
});
