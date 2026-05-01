"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { ProposalSubmissionInput } from "@/lib/proposals/schemas";

export function ProposalUploadForm({ studentId }: { studentId: string }) {
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [formValues, setFormValues] = useState({
    title: "",
    abstract: "",
  });

  const [uploadedDocument, setUploadedDocument] = useState<{
    fileName: string;
    storagePath: string;
    mimeType: "application/pdf";
    sizeBytes: number;
  } | null>(null);

  function updateField(name: keyof typeof formValues, value: string) {
    setFormValues((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleDocumentUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);

    try {
      const uploadUrlResponse = await fetch("/api/proposals/upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId,
          fileName: file.name,
          contentType: file.type,
          fileSizeBytes: file.size,
        }),
      });

      const uploadUrlPayload = await uploadUrlResponse.json();

      if (!uploadUrlResponse.ok || !uploadUrlPayload.signedUrl || !uploadUrlPayload.storagePath) {
        throw new Error(uploadUrlPayload.error ?? "Unable to prepare the file upload.");
      }

      const uploadResponse = await fetch(uploadUrlPayload.signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("File upload failed.");
      }

      setUploadedDocument({
        fileName: file.name,
        storagePath: uploadUrlPayload.storagePath,
        mimeType: "application/pdf",
        sizeBytes: file.size,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to upload the selected document."
      );
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!uploadedDocument) {
      setErrorMessage("Please upload a research proposal PDF.");
      return;
    }

    setIsSubmitting(true);

    try {
      const submissionData: ProposalSubmissionInput = {
        studentId,
        title: formValues.title,
        abstract: formValues.abstract,
        fileName: uploadedDocument.fileName,
        storagePath: uploadedDocument.storagePath,
        mimeType: uploadedDocument.mimeType,
        sizeBytes: uploadedDocument.sizeBytes,
      };

      const response = await fetch("/api/proposals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionData),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Proposal submission failed.");
      }

      setSuccessMessage("Research proposal submitted successfully.");
      setFormValues({ title: "", abstract: "" });
      setUploadedDocument(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Proposal submission failed."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-lg">
        <h2 className="text-2xl font-semibold text-white">Submit Research Proposal</h2>
        <p className="mt-2 text-sm text-slate-400">
          Upload your research proposal PDF (Max 50MB). If your previous proposal was rejected, you may submit a revised version here.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-lg">
        {errorMessage ? (
          <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {successMessage}
          </div>
        ) : null}

        <div className="space-y-4">
          <label className="block space-y-2 text-sm text-slate-200">
            <span>Proposal Title</span>
            <input
              value={formValues.title}
              onChange={(e) => updateField("title", e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 outline-none focus:border-sky-400"
              placeholder="Enter your research proposal title"
              required
              minLength={5}
            />
          </label>

          <label className="block space-y-2 text-sm text-slate-200">
            <span>Abstract</span>
            <textarea
              value={formValues.abstract}
              onChange={(e) => updateField("abstract", e.target.value)}
              className="min-h-[120px] w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 outline-none focus:border-sky-400"
              placeholder="Provide an abstract or summary (minimum 20 characters)"
              required
              minLength={20}
            />
          </label>

          <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-4">
            <p className="text-sm font-medium text-white">Upload Proposal PDF</p>
            <p className="mt-1 text-xs text-slate-400">PDF only. Maximum file size: 50MB.</p>
            <input
              className="mt-4 block w-full text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-sky-400 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-slate-950 hover:file:bg-sky-300"
              type="file"
              accept="application/pdf"
              onChange={handleDocumentUpload}
              disabled={isUploading}
            />
            {isUploading && <p className="mt-2 text-sm text-sky-400">Uploading PDF...</p>}
            
            {uploadedDocument && !isUploading && (
              <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                <p className="text-sm font-medium text-emerald-100">Ready to submit: {uploadedDocument.fileName}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSubmitting || isUploading || !uploadedDocument}
            className="rounded-xl bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit Proposal"}
          </button>
        </div>
      </form>
    </div>
  );
}
