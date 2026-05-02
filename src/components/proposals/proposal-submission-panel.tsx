"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import Link from "next/link";

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
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusBadge(status: ProposalSummary["status"]) {
  switch (status) {
    case "APPROVED":
      return "border-emerald-500 text-emerald-600 bg-emerald-50";
    case "REJECTED":
      return "border-red-400 text-red-600 bg-red-50";
    case "UNDER_REVIEW":
      return "border-black text-black bg-white";
    case "SUBMITTED":
      return "border-gray-400 text-gray-600 bg-white";
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
    <div className="space-y-10">
      <header className="pb-10 border-b-2 border-gray-300">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-4">
            <p className="text-base font-black uppercase tracking-[0.3em] text-black/40">
              Research Workspace
            </p>
            <h1 className="text-5xl font-black tracking-tighter text-black sm:text-6xl">
              Proposals
            </h1>
            <p className="max-w-2xl text-xl font-medium leading-relaxed text-black/80">
              Submit and manage your research proposals. New versions can be 
              uploaded following academic feedback or rejection.
            </p>
          </div>
          {proposal && (
            <div className={`rounded-2xl border-2 px-6 py-2 text-sm font-black uppercase tracking-widest shadow-sm ${getStatusBadge(proposal.status)}`}>
              {proposal.status.replaceAll("_", " ")}
            </div>
          )}
        </div>
      </header>

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-600 shadow-[inset_4px_4px_8px_#fca5a5,inset_-4px_-4px_8px_#ffffff]">
          <p className="font-bold">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-600 shadow-[inset_4px_4px_8px_#a7f3d0,inset_-4px_-4px_8px_#ffffff]">
          <p className="font-bold">{successMessage}</p>
        </div>
      )}

      <section className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8">
          <form
            onSubmit={handleSubmit}
            className="rounded-[40px] bg-[#e0e0e0] p-1 shadow-[15px_15px_30px_#bebebe,-15px_-15px_30px_#ffffff]"
          >
            <div className="p-8 sm:p-10">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-3xl font-black tracking-tight text-black">
                    {proposal ? "Revise Proposal" : "New Submission"}
                  </h2>
                  <p className="mt-2 text-lg font-medium text-black/50">
                    Version control enabled for academic integrity.
                  </p>
                </div>
                {proposal && (
                  <div className="rounded-2xl border border-gray-300 bg-[#e0e0e0] px-5 py-3 text-center shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff]">
                    <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Version</p>
                    <p className="text-xl font-black text-black">V{proposal.currentVersion}</p>
                  </div>
                )}
              </div>

              {!overview?.canSubmitNewVersion && overview?.submissionBlockedReason ? (
                <div className="mt-8 rounded-[24px] border border-purple-200 bg-[#e0e0e0] p-6 shadow-[inset_6px_6px_12px_#bebebe,inset_-6px_-6px_12px_#ffffff,0_0_20px_rgba(147,51,234,0.1)]">
                  <p className="text-base font-black text-purple-700 leading-tight">
                    {overview.submissionBlockedReason}
                  </p>
                </div>
              ) : (
                <div className="mt-8 space-y-6">
                  <label className="block space-y-2">
                    <span className="ml-2 text-xs font-black uppercase tracking-widest text-black/40">Proposal Title</span>
                    <div className="rounded-2xl border border-gray-300 bg-[#e0e0e0] p-1 shadow-[inset_6px_6px_12px_#bebebe,inset_-6px_-6px_12px_#ffffff]">
                      <input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        className="w-full bg-transparent px-5 py-4 text-lg font-bold text-black outline-none placeholder:text-black/20"
                        placeholder="Research title..."
                        disabled={isLoading || !overview?.canSubmitNewVersion || isSubmitting}
                      />
                    </div>
                  </label>

                  <label className="block space-y-2">
                    <span className="ml-2 text-xs font-black uppercase tracking-widest text-black/40">Abstract</span>
                    <div className="rounded-[2rem] border border-gray-300 bg-[#e0e0e0] p-1 shadow-[inset_6px_6px_12px_#bebebe,inset_-6px_-6px_12px_#ffffff]">
                      <textarea
                        value={abstract}
                        onChange={(event) => setAbstract(event.target.value)}
                        className="min-h-44 w-full bg-transparent px-6 py-5 text-base font-medium text-black outline-none placeholder:text-black/20"
                        placeholder="Summarize your research methodology and impact..."
                        disabled={isLoading || !overview?.canSubmitNewVersion || isSubmitting}
                      />
                    </div>
                  </label>

                  <div className="rounded-[2rem] border border-gray-300 bg-[#e0e0e0] p-8 shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff]">
                    <p className="text-xs font-black uppercase tracking-widest text-black/40">Document Upload</p>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileUpload}
                      disabled={isLoading || !overview?.canSubmitNewVersion || isUploading}
                      className="mt-6 block w-full text-sm text-black file:mr-6 file:rounded-xl file:border-0 file:bg-black file:px-6 file:py-3 file:text-xs file:font-black file:uppercase file:tracking-widest file:text-white hover:file:bg-gray-800 cursor-pointer"
                    />
                    {uploadedDocument && (
                      <div className="mt-6 flex items-center gap-3 rounded-xl bg-black/5 px-4 py-3">
                        <svg className="h-5 w-5 text-black/40" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-bold text-black truncate">{uploadedDocument.fileName}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={isLoading || isSubmitting || isUploading || !overview?.canSubmitNewVersion}
                      className="rounded-[20px] bg-black px-10 py-4 text-sm font-black uppercase tracking-widest text-white shadow-[8px_8px_16px_#bebebe] transition-all hover:bg-gray-800 hover:shadow-none active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? "Processing..." : proposal ? "Submit Revision" : "Send Proposal"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        <section className="space-y-8">
          <div className="rounded-[40px] bg-[#e0e0e0] p-1 shadow-[15px_15px_30px_#bebebe,-15px_-15px_30px_#ffffff]">
            <div className="p-8 sm:p-10">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black tracking-tight text-black">History</h2>
                <button
                  type="button"
                  onClick={() => void refreshOverview()}
                  disabled={isLoading}
                  className="rounded-xl border border-gray-300 bg-[#e0e0e0] p-3 shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff] transition-all active:shadow-none"
                >
                  <svg className={`h-5 w-5 text-black ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>

              {!proposal ? (
                <div className="mt-8 flex flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-gray-300 py-20 text-center">
                  <p className="text-lg font-bold text-black/20 uppercase tracking-widest">Repository Empty</p>
                </div>
              ) : (
                <div className="mt-8 space-y-6">
                  {proposal.documents.map((doc) => (
                    <article
                      key={doc.id}
                      className={`relative rounded-[32px] border p-6 transition-all ${
                        doc.isCurrentVersion 
                          ? 'border-black bg-black text-white shadow-[8px_8px_16px_#bebebe]' 
                          : 'border-gray-300 bg-[#e0e0e0] shadow-[6px_6px_12px_#bebebe,-6px_-6px_12px_#ffffff] opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <p className={`text-[10px] font-black uppercase tracking-widest ${doc.isCurrentVersion ? 'text-white/50' : 'text-black/40'}`}>
                            Version {doc.version}
                          </p>
                          <h4 className="mt-1 truncate text-lg font-black tracking-tight">{doc.fileName}</h4>
                        </div>
                        {doc.isCurrentVersion && (
                          <span className="rounded-lg bg-white/20 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white">Latest</span>
                        )}
                      </div>
                      <p className={`mt-4 text-[10px] font-bold uppercase tracking-widest ${doc.isCurrentVersion ? 'text-white/40' : 'text-black/30'}`}>
                        {formatDateLabel(doc.createdAt)}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
