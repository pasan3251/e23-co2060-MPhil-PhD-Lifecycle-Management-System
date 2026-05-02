"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import {
  proposalSubmissionSchema,
  proposalUploadRequestSchema,
} from "@/lib/proposals/schemas";

type ProposalDocument = {
  id: string;
  fileName: string;
  storagePath: string;
  mimeType: string;
  version: number;
  isCurrentVersion: boolean;
  createdAt: string;
};

type ProposalSummary = {
  id: string;
  title: string;
  abstract: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  currentVersion: number;
  applicationId: string;
  createdAt: string;
  updatedAt: string;
  documents: ProposalDocument[];
};

type ProposalOverviewResponse = {
  proposal: ProposalSummary | null;
  canSubmitNewVersion: boolean;
  submissionBlockedReason: string | null;
  hasActiveRegistration: boolean;
  applicationId: string | null;
  error?: string;
};

type UploadedProposalDocument = {
  fileName: string;
  storagePath: string;
  mimeType: "application/pdf";
  sizeBytes: number;
};

async function loadProposalOverview(): Promise<ProposalOverviewResponse> {
  const response = await fetch("/api/proposals", {
    credentials: "include",
  });
  const payload = (await response.json()) as ProposalOverviewResponse;

  if (!response.ok) {
    throw new Error(payload.error ?? "Unable to load the proposal workspace.");
  }

  return payload;
}

function formatDateLabel(value: string) {
  return new Date(value).toLocaleString();
}

function getStatusTone(status: ProposalSummary["status"]) {
  switch (status) {
    case "APPROVED":
      return "border-2 border-black bg-white text-black";
    case "REJECTED":
      return "border-2 border-black bg-white text-black";
    case "UNDER_REVIEW":
      return "border-2 border-black bg-white text-black";
    case "SUBMITTED":
      return "border-2 border-black bg-white text-black";
  }
}

export function ProposalSubmissionPanel() {
  const [overview, setOverview] = useState<ProposalOverviewResponse | null>(null);
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [uploadedDocument, setUploadedDocument] =
    useState<UploadedProposalDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function refreshOverview() {
    setIsLoading(true);

    try {
      const nextOverview = await loadProposalOverview();
      setOverview(nextOverview);

      if (nextOverview.proposal) {
        setTitle(nextOverview.proposal.title);
        setAbstract(nextOverview.proposal.abstract);
      } else {
        setTitle("");
        setAbstract("");
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load the proposal workspace.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshOverview();
  }, []);

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const parsedUploadRequest = proposalUploadRequestSchema.safeParse({
      fileName: file.name,
      contentType: file.type,
      fileSizeBytes: file.size,
    });

    if (!parsedUploadRequest.success) {
      setErrorMessage(
        parsedUploadRequest.error.issues[0]?.message ??
          "Unable to upload the proposal PDF.",
      );
      setUploadedDocument(null);
      event.target.value = "";
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsUploading(true);

    try {
      const uploadUrlResponse = await fetch("/api/proposals/upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          fileName: parsedUploadRequest.data.fileName,
          contentType: parsedUploadRequest.data.contentType,
          fileSizeBytes: parsedUploadRequest.data.fileSizeBytes,
        }),
      });
      const uploadUrlPayload = (await uploadUrlResponse.json()) as {
        error?: string;
        signedUrl?: string;
        storagePath?: string;
      };

      if (
        !uploadUrlResponse.ok ||
        !uploadUrlPayload.signedUrl ||
        !uploadUrlPayload.storagePath
      ) {
        throw new Error(uploadUrlPayload.error ?? "Unable to prepare the proposal upload.");
      }

      const uploadResponse = await fetch(uploadUrlPayload.signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Proposal file upload failed.");
      }

      setUploadedDocument({
        fileName: file.name,
        storagePath: uploadUrlPayload.storagePath,
        mimeType: "application/pdf",
        sizeBytes: file.size,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to upload the proposal PDF.",
      );
      setUploadedDocument(null);
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
      setErrorMessage("Upload a PDF proposal before submitting.");
      return;
    }

    const parsedSubmission = proposalSubmissionSchema.safeParse({
      title,
      abstract,
      document: uploadedDocument,
    });

    if (!parsedSubmission.success) {
      setErrorMessage(
        parsedSubmission.error.issues[0]?.message ??
          "Invalid proposal submission.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/proposals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(parsedSubmission.data),
      });
      const payload = (await response.json()) as {
        error?: string;
        proposal?: ProposalSummary;
      };

      if (!response.ok || !payload.proposal) {
        throw new Error(payload.error ?? "Proposal submission failed.");
      }

      setSuccessMessage(
        payload.proposal.currentVersion > 1
          ? `Proposal version ${payload.proposal.currentVersion} submitted successfully.`
          : "Proposal submitted successfully.",
      );
      setUploadedDocument(null);
      await refreshOverview();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Proposal submission failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const proposal = overview?.proposal ?? null;

  return (
    <main className="space-y-12">
      <section className="border-b-2 border-gray-200 pb-10">
        <p className="text-base font-black uppercase tracking-[0.3em] text-black/40">
          Research Proposal
        </p>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-5xl font-black tracking-tighter text-black sm:text-6xl">
              Proposal submission and version history
            </h1>
            <p className="mt-3 max-w-3xl text-xl font-medium leading-relaxed text-black/80">
              Upload your initial proposal as a PDF, or submit a revised version
              only after a rejection. Every version remains visible in the
              repository history.
            </p>
          </div>
          {proposal ? (
            <span
              className={`inline-flex rounded-full px-3 py-1 text-base font-black uppercase tracking-wider ${getStatusTone(proposal.status)}`}
            >
              {proposal.status.replaceAll("_", " ")}
            </span>
          ) : null}
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-2xl border-2 border-black bg-white px-6 py-4 text-base font-bold text-black shadow-[4px_4px_0px_black]">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border-2 border-black bg-white px-6 py-4 text-base font-bold text-black shadow-[4px_4px_0px_black]">
          {successMessage}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-[24px] border border-gray-300 bg-white p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-black">
                {proposal ? "Submit a revised proposal" : "Submit your proposal"}
              </h2>
              <p className="mt-3 text-base font-medium leading-6 text-black/70">
                Upload a PDF up to 50MB. The newest file becomes the current
                version while earlier versions stay in the database.
              </p>
            </div>
            {proposal ? (
              <div className="rounded-[24px] border border-gray-300 bg-white px-4 py-3 text-right">
                <p className="text-xs font-black uppercase tracking-widest text-black/40">
                  Current version
                </p>
                <p className="mt-2 text-2xl font-black tracking-tight text-black">
                  V{proposal.currentVersion}
                </p>
              </div>
            ) : null}
          </div>

          {!overview?.canSubmitNewVersion && overview?.submissionBlockedReason ? (
            <div className="mt-5 rounded-2xl border-2 border-black bg-white px-4 py-3 text-base font-bold text-black">
              {overview.submissionBlockedReason}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4">
            <label className="space-y-2 text-base text-black">
              <span className="ml-1 text-xs font-black uppercase tracking-widest text-black/40">
                Proposal title
              </span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-[0.75em] border-2 border-black bg-white px-5 py-4 font-bold text-black outline-none transition focus:bg-gray-50"
                placeholder="Explainable AI for postgraduate supervision workflows"
                disabled={isLoading || !overview?.canSubmitNewVersion || isSubmitting}
              />
            </label>

            <label className="space-y-2 text-base text-black">
              <span className="ml-1 text-xs font-black uppercase tracking-widest text-black/40">
                Abstract
              </span>
              <textarea
                value={abstract}
                onChange={(event) => setAbstract(event.target.value)}
                className="min-h-44 w-full rounded-[0.75em] border-2 border-black bg-white px-5 py-4 font-bold text-black outline-none transition focus:bg-gray-50"
                placeholder="Summarize your proposed problem, methodology, and expected contribution."
                disabled={isLoading || !overview?.canSubmitNewVersion || isSubmitting}
              />
            </label>

            <div className="rounded-[24px] border border-gray-300 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-widest text-black/40">
                Upload proposal PDF
              </p>
              <p className="mt-3 text-base font-medium text-black/70">
                Only PDF documents are accepted. Maximum size: 50MB.
              </p>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileUpload}
                disabled={isLoading || !overview?.canSubmitNewVersion || isUploading}
                className="mt-4 block w-full text-base text-black file:mr-4 file:rounded-[0.75em] file:border-2 file:border-black file:bg-black file:px-4 file:py-3 file:font-bold file:text-white"
              />
              {isUploading ? (
                <p className="mt-3 text-base font-medium text-black/70">
                  Uploading proposal PDF...
                </p>
              ) : null}
              {uploadedDocument ? (
                <div className="mt-4 rounded-2xl border-2 border-black bg-white px-4 py-3 text-base font-bold text-black">
                  {uploadedDocument.fileName} ready for submission.
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-base font-medium leading-6 text-black/70">
              {proposal
                ? "Resubmissions create a new document version and keep all prior versions intact."
                : "Your first submission creates version 1 and opens the proposal review workflow."}
            </p>
            <button
              type="submit"
              disabled={
                isLoading ||
                isSubmitting ||
                isUploading ||
                !overview?.canSubmitNewVersion
              }
              className="group inline-block cursor-pointer rounded-[0.75em] bg-black text-base font-bold disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="block -translate-y-[0.2em] rounded-[0.75em] border-2 border-black bg-black px-5 py-3 text-white transition-transform duration-100 ease-out group-hover:-translate-y-[0.33em] group-active:translate-y-0">
                {isSubmitting ? "Submitting..." : proposal ? "Submit revised proposal" : "Submit proposal"}
              </span>
            </button>
          </div>
        </form>

        <section className="rounded-[24px] border border-gray-300 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-black">Proposal history</h2>
              <p className="mt-3 text-base font-medium leading-6 text-black/70">
                Review the latest status and every stored file version.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refreshOverview()}
              disabled={isLoading}
              className="rounded-xl border-2 border-black px-5 py-3 text-xs font-black uppercase tracking-widest text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="mt-6 rounded-[24px] border border-gray-300 bg-white px-4 py-6 text-base font-medium text-black/70">
              Loading proposal workspace...
            </div>
          ) : !proposal ? (
            <div className="mt-6 rounded-[24px] border border-dashed border-gray-300 bg-white px-4 py-6 text-base font-bold text-black/40">
              No proposal has been submitted yet.
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <div className="rounded-[24px] border border-gray-300 bg-white p-5">
                <p className="text-base font-black uppercase tracking-[0.18em] text-black/40">
                  Current proposal
                </p>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-black">{proposal.title}</h3>
                <p className="mt-1 break-all text-base font-bold text-black/70">ID: {proposal.id}</p>
                <p className="mt-3 whitespace-pre-wrap text-base font-medium leading-6 text-black/80">
                  {proposal.abstract}
                </p>
                <p className="mt-4 text-base font-black uppercase tracking-[0.18em] text-black/40">
                  Updated {formatDateLabel(proposal.updatedAt)}
                </p>
              </div>

              <div className="space-y-3">
                {proposal.documents.map((document) => (
                  <article
                    key={document.id}
                    className="rounded-[24px] border border-gray-300 bg-white px-5 py-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-black tracking-tight text-black">{document.fileName}</p>
                        <p className="mt-1 text-base font-black uppercase tracking-[0.18em] text-black/40">
                          Version {document.version} • {document.mimeType}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-base font-semibold ${
                          document.isCurrentVersion
                            ? "border-2 border-black bg-white text-black"
                            : "border border-gray-300 bg-white text-black"
                        }`}
                      >
                        {document.isCurrentVersion ? "Current" : "Previous"}
                      </span>
                    </div>
                    <p className="mt-3 break-all text-base font-medium leading-6 text-black/80">
                      {document.storagePath}
                    </p>
                    <p className="mt-2 text-base font-black uppercase tracking-[0.16em] text-black/40">
                      Stored {formatDateLabel(document.createdAt)}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
