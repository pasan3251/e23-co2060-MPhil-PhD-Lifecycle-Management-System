"use client";

import { useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import {
  applicationProgramTypes,
  applicationSubmissionSchema,
} from "@/lib/applications/schemas";

type UploadedSupportingDocument = {
  fileName: string;
  storagePath: string;
  mimeType: "application/pdf";
  sizeBytes: number;
};

const stepLabels = ["Applicant", "Research", "Documents", "Review"] as const;

function createDraftId() {
  return `application-${crypto.randomUUID()}`;
}

export function ApplicationForm() {
  const [step, setStep] = useState(0);
  const [draftId] = useState(() => createDraftId());
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [documents, setDocuments] = useState<UploadedSupportingDocument[]>([]);
  const [formValues, setFormValues] = useState({
    applicantName: "",
    applicantEmail: "",
    applicantPhone: "",
    programType: "MPHIL" as (typeof applicationProgramTypes)[number],
    researchArea: "",
    statementOfPurpose: "",
  });

  const currentStepLabel = useMemo(() => stepLabels[step], [step]);

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
    setIsUploadingDocument(true);

    try {
      const formData = new FormData();
      formData.append("draftId", draftId);
      formData.append("file", file);

      const uploadResponse = await fetch("/api/applications/upload", {
        method: "POST",
        body: formData,
      });

      const uploadPayload = (await uploadResponse.json()) as {
        error?: string;
        storagePath?: string;
        fileName?: string;
        mimeType?: "application/pdf";
        sizeBytes?: number;
      };

      if (
        !uploadResponse.ok ||
        !uploadPayload.storagePath ||
        !uploadPayload.fileName ||
        !uploadPayload.mimeType ||
        typeof uploadPayload.sizeBytes !== "number"
      ) {
        throw new Error(uploadPayload.error ?? "Unable to upload the selected document.");
      }

      const {
        storagePath,
        fileName,
        mimeType,
        sizeBytes,
      } = uploadPayload;

      setDocuments((current) => [
        ...current,
        {
          fileName,
          storagePath,
          mimeType,
          sizeBytes,
        },
      ]);
    } catch (error) {
      setErrorMessage(
        error instanceof TypeError
          ? "Unable to reach the upload service. Please try again."
          : error instanceof Error
            ? error.message
            : "Unable to upload the selected document.",
      );
    } finally {
      setIsUploadingDocument(false);
      event.target.value = "";
    }
  }

  function nextStep() {
    setStep((current) => Math.min(current + 1, stepLabels.length - 1));
  }

  function previousStep() {
    setStep((current) => Math.max(current - 1, 0));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const parsed = applicationSubmissionSchema.safeParse({
      ...formValues,
      supportingDocuments: documents,
    });

    if (!parsed.success) {
      setErrorMessage(
        parsed.error.issues[0]?.message ?? "Invalid application data.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      });
      const payload = (await response.json()) as {
        error?: string;
        application?: {
          id: string;
        };
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Application submission failed.");
      }

      setSuccessMessage(
        `Application submitted successfully. Reference: ${payload.application?.id ?? "pending"}.`,
      );
      setStep(0);
      setDocuments([]);
      setFormValues({
        applicantName: "",
        applicantEmail: "",
        applicantPhone: "",
        programType: "MPHIL",
        researchArea: "",
        statementOfPurpose: "",
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Application submission failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-[2rem] border border-slate-800 bg-slate-950/75 p-5 shadow-[0_24px_80px_rgba(2,6,23,0.45)] sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-amber-300">
          Postgraduate Admissions
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
          Apply for your research programme
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          Complete the public application form, upload supporting PDFs, and submit
          your research interest for review.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stepLabels.map((label, index) => {
          const isCurrent = index === step;
          const isCompleted = index < step;

          return (
            <div
              key={label}
              className={`rounded-[1.5rem] border px-4 py-4 text-sm ${
                isCurrent
                  ? "border-sky-400 bg-sky-500/10 text-sky-100"
                  : isCompleted
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                    : "border-slate-800 bg-slate-950/70 text-slate-300"
              }`}
            >
              <p className="text-xs uppercase tracking-[0.2em]">
                Step {index + 1}
              </p>
              <p className="mt-2 font-semibold">{label}</p>
            </div>
          );
        })}
      </section>

      <form
        className="rounded-[2rem] border border-slate-800 bg-slate-950/75 p-5 shadow-[0_24px_80px_rgba(2,6,23,0.45)] sm:p-7"
        onSubmit={handleSubmit}
      >
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
            Current step
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            {currentStepLabel}
          </h2>
        </div>

        {errorMessage ? (
          <div className="mb-5 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mb-5 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {successMessage}
          </div>
        ) : null}

        {step === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-200">
              <span>Full name</span>
              <input
                value={formValues.applicantName}
                onChange={(event) => updateField("applicantName", event.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-sky-400"
                placeholder="Applicant full name"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-200">
              <span>Email</span>
              <input
                value={formValues.applicantEmail}
                onChange={(event) => updateField("applicantEmail", event.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-sky-400"
                placeholder="name@example.com"
                type="email"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-200 sm:col-span-2">
              <span>Phone</span>
              <input
                value={formValues.applicantPhone}
                onChange={(event) => updateField("applicantPhone", event.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-sky-400"
                placeholder="+94 7X XXX XXXX"
              />
            </label>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-4">
            <label className="space-y-2 text-sm text-slate-200">
              <span>Programme</span>
              <select
                value={formValues.programType}
                onChange={(event) => updateField("programType", event.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-sky-400"
              >
                {applicationProgramTypes.map((programType) => (
                  <option key={programType} value={programType}>
                    {programType}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm text-slate-200">
              <span>Research area</span>
              <input
                value={formValues.researchArea}
                onChange={(event) => updateField("researchArea", event.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-sky-400"
                placeholder="Machine Learning for Education"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-200">
              <span>Statement of purpose</span>
              <textarea
                value={formValues.statementOfPurpose}
                onChange={(event) =>
                  updateField("statementOfPurpose", event.target.value)
                }
                className="min-h-40 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-sky-400"
                placeholder="Describe your motivation, proposed area, and fit for the programme."
              />
            </label>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-sm font-medium text-white">
                Upload supporting documents
              </p>
              <p className="mt-2 text-sm text-slate-400">
                PDF only. Maximum file size: 10MB per document.
              </p>
              <input
                className="mt-4 block w-full text-sm text-slate-300 file:mr-4 file:rounded-2xl file:border-0 file:bg-sky-400 file:px-4 file:py-3 file:font-semibold file:text-slate-950"
                type="file"
                accept="application/pdf"
                onChange={handleDocumentUpload}
                disabled={isUploadingDocument}
              />
              {isUploadingDocument ? (
                <p className="mt-3 text-sm text-sky-200">Uploading PDF...</p>
              ) : null}
            </div>

            <div className="space-y-3">
              {documents.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-slate-700 px-4 py-5 text-sm text-slate-400">
                  No supporting documents uploaded yet.
                </div>
              ) : (
                documents.map((document) => (
                  <div
                    key={document.storagePath}
                    className="rounded-[1.5rem] border border-slate-800 bg-slate-900/70 px-4 py-4"
                  >
                    <p className="font-medium text-white">{document.fileName}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                      {(document.sizeBytes / (1024 * 1024)).toFixed(2)} MB • PDF
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4 rounded-[1.5rem] border border-slate-800 bg-slate-900/70 p-4">
            <div>
              <p className="text-sm font-medium text-white">{formValues.applicantName}</p>
              <p className="text-sm text-slate-400">{formValues.applicantEmail}</p>
              <p className="text-sm text-slate-400">{formValues.applicantPhone}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Programme
                </p>
                <p className="mt-1 text-sm text-slate-200">{formValues.programType}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Research area
                </p>
                <p className="mt-1 text-sm text-slate-200">{formValues.researchArea}</p>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Statement
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                {formValues.statementOfPurpose}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Supporting PDFs
              </p>
              <ul className="mt-2 space-y-2 text-sm text-slate-200">
                {documents.map((document) => (
                  <li key={document.storagePath}>{document.fileName}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={previousStep}
            disabled={step === 0 || isSubmitting}
            className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Back
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">
            {step < stepLabels.length - 1 ? (
              <button
                type="button"
                onClick={nextStep}
                className="rounded-2xl bg-sky-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-2xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Submitting..." : "Submit application"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
