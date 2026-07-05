"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import {
  progressReportDocumentSchema,
  progressReportSubmissionSchema,
} from "@/lib/progress-reports/schemas";

type ProgressReportSubmissionResponse = {
  error?: string;
  upload?: {
    signedUrl: string;
    storagePath: string;
    expiresInMinutes: number;
  } | null;
};

export function ProgressReportSubmissionForm() {
  const router = useRouter();
  const [periodLabel, setPeriodLabel] = useState("");
  const [narrative, setNarrative] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function buildSubmissionInput() {
    return {
      periodLabel,
      narrative,
      document: documentFile
        ? {
            fileName: documentFile.name,
            mimeType: documentFile.type,
            sizeBytes: documentFile.size,
          }
        : undefined,
    };
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;

    if (!nextFile) {
      setDocumentFile(null);
      return;
    }

    const parsedDocument = progressReportDocumentSchema.safeParse({
      fileName: nextFile.name,
      mimeType: nextFile.type,
      sizeBytes: nextFile.size,
    });

    if (!parsedDocument.success) {
      setErrorMessage(
        parsedDocument.error.issues[0]?.message ??
          "Choose a valid PDF progress report document.",
      );
      setDocumentFile(null);
      event.target.value = "";
      return;
    }

    setErrorMessage(null);
    setDocumentFile(nextFile);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);

    const parsed = progressReportSubmissionSchema.safeParse(buildSubmissionInput());

    if (!parsed.success) {
      setErrorMessage(
        parsed.error.issues[0]?.message ?? "Invalid progress report details.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/student/progress-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });

      const payload = (await response.json()) as ProgressReportSubmissionResponse;

      if (!response.ok) {
        setErrorMessage(payload.error ?? "Failed to submit progress report.");
        return;
      }

      if (documentFile) {
        if (!payload.upload?.signedUrl) {
          setErrorMessage(
            "The report was saved, but no document upload URL was returned.",
          );
          return;
        }

        const uploadResponse = await fetch(payload.upload.signedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "application/pdf",
          },
          body: documentFile,
        });

        if (!uploadResponse.ok) {
          setErrorMessage(
            "The report was saved, but the PDF upload failed. Please try again.",
          );
          return;
        }
      }

      router.push("/dashboard/student/progress-reports");
      router.refresh();
    } catch (error) {
      setErrorMessage("A network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-[24px] border border-gray-300 bg-white p-6">
      {errorMessage && (
        <div className="rounded-2xl border-2 border-black bg-white px-4 py-3 text-base font-bold text-black">
          {errorMessage}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="periodLabel" className="ml-1 text-xs font-black uppercase tracking-widest text-black/40">
          Reporting period
        </label>
        <input
          id="periodLabel"
          type="text"
          required
          value={periodLabel}
          onChange={(e) => setPeriodLabel(e.target.value)}
          placeholder="e.g. Jan-Jun 2024"
          className="w-full rounded-[0.75em] border-2 border-black bg-white px-5 py-4 font-bold text-black outline-none transition focus:bg-gray-50"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="narrative" className="ml-1 text-xs font-black uppercase tracking-widest text-black/40">
          Report
        </label>
        <textarea
          id="narrative"
          required
          rows={10}
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          placeholder="Summarize your progress, challenges, and next steps (min 100 characters)..."
          className="w-full rounded-[0.75em] border-2 border-black bg-white px-5 py-4 font-bold text-black outline-none transition focus:bg-gray-50"
        />
        <p className="text-right text-base font-medium text-black/40">
          {narrative.length} characters (min 100)
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="document" className="ml-1 text-xs font-black uppercase tracking-widest text-black/40">
          Supporting PDF
        </label>
        <input
          id="document"
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="block w-full text-base font-bold text-black file:mr-4 file:rounded-[0.75em] file:border-2 file:border-black file:bg-black file:px-4 file:py-3 file:text-xs file:font-black file:uppercase file:tracking-widest file:text-white"
        />
        {documentFile ? (
          <p className="break-all text-base font-bold text-black/70">
            Selected: {documentFile.name}
          </p>
        ) : (
          <p className="text-base font-medium text-black/40">
            Optional. Attach a PDF if the report has supporting material.
          </p>
        )}
      </div>

      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border-2 border-black px-6 py-3 text-xs font-black uppercase tracking-widest text-black transition hover:bg-black hover:text-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={
            isSubmitting ||
            !progressReportSubmissionSchema.safeParse(buildSubmissionInput()).success
          }
          className="group inline-block cursor-pointer rounded-[0.75em] bg-black text-base font-bold disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="block -translate-y-[0.2em] rounded-[0.75em] border-2 border-black bg-black px-8 py-3 text-white transition-transform duration-100 ease-out group-hover:-translate-y-[0.33em] group-active:translate-y-0">
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </span>
        </button>
      </div>
    </form>
  );
}
