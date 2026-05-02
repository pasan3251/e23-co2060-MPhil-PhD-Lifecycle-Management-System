"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent } from "react";

import {
  correctionSubmissionSchema,
  uploadedPdfDocumentSchema,
} from "@/lib/theses/schemas";

type Correction = {
  id: string;
  correctionType: string;
  description: string | null;
  isApproved: boolean;
  createdAt: string | Date;
  documents: Array<{
    id: string;
    fileName: string;
    storagePath: string;
    version: number;
  }>;
};

type ThesisForCorrections = {
  id: string;
  title: string;
  status: string;
  corrections: Correction[];
} | null;

export function ThesisCorrectionPanel({
  thesis,
}: {
  thesis: ThesisForCorrections;
}) {
  const router = useRouter();
  const [correctionType, setCorrectionType] = useState("MINOR");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;

    if (!nextFile) {
      setFile(null);
      return;
    }

    const parsedDocument = uploadedPdfDocumentSchema.safeParse({
      fileName: nextFile.name,
      mimeType: nextFile.type,
      sizeBytes: nextFile.size,
    });

    if (!parsedDocument.success) {
      setError(
        parsedDocument.error.issues[0]?.message ??
          "Choose a valid corrected PDF document.",
      );
      setFile(null);
      event.target.value = "";
      return;
    }

    setError(null);
    setFile(nextFile);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!thesis) return;

    setMessage(null);
    setError(null);

    if (!file) {
      setError("Choose a corrected PDF document first.");
      return;
    }

    const parsedSubmission = correctionSubmissionSchema.safeParse({
      correctionType,
      description,
      document: file
        ? {
            fileName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
          }
        : undefined,
    });

    if (!parsedSubmission.success) {
      setError(
        parsedSubmission.error.issues[0]?.message ??
          "Invalid correction submission details.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/theses/${thesis.id}/corrections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(parsedSubmission.data),
      });
      const payload = (await response.json()) as {
        error?: string;
        upload?: {
          signedUrl: string;
          storagePath: string;
        };
      };

      if (!response.ok || !payload.upload?.signedUrl) {
        throw new Error(payload.error ?? "Unable to submit corrections.");
      }

      const uploadResponse = await fetch(payload.upload.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("The correction record was created, but the PDF upload failed.");
      }

      setMessage("Correction document submitted for administrator approval.");
      setDescription("");
      setFile(null);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Correction submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSubmit = thesis?.status === "CORRECTIONS_REQUIRED";

  return (
    <main className="space-y-12">
      <section className="border-b-2 border-gray-200 pb-10">
        <p className="text-base font-black uppercase tracking-[0.3em] text-black/40">
          Corrections
        </p>
        <h1 className="mt-3 text-5xl font-black tracking-tighter text-black sm:text-6xl">
          Submit Corrections
        </h1>
        <p className="mt-3 max-w-3xl text-xl font-medium leading-relaxed text-black/80">
          Upload corrected thesis files when corrections are required.
        </p>
      </section>

      {error ? (
        <div className="rounded-2xl border-2 border-black bg-white px-6 py-4 text-base font-bold text-black shadow-[4px_4px_0px_black]">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-2xl border-2 border-black bg-white px-6 py-4 text-base font-bold text-black shadow-[4px_4px_0px_black]">
          {message}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-[24px] border border-gray-300 bg-white p-6"
        >
          <h2 className="text-3xl font-black tracking-tight text-black">Submit Corrections</h2>
          {!thesis ? (
            <p className="mt-4 rounded-[1.5rem] border border-dashed border-gray-300 px-4 py-6 text-base font-bold text-black/40">
              No thesis record yet.
            </p>
          ) : !canSubmit ? (
            <p className="mt-4 rounded-2xl border-2 border-black bg-white px-4 py-3 text-base font-bold text-black">
              Corrections can only be uploaded while the thesis status is
              CORRECTIONS REQUIRED. Current status: {thesis.status.replaceAll("_", " ")}.
            </p>
          ) : (
            <div className="mt-5 grid gap-4">
              <label className="space-y-2 text-base text-black">
                <span className="ml-1 text-xs font-black uppercase tracking-widest text-black/40">Correction type</span>
                <select
                  value={correctionType}
                  onChange={(event) => setCorrectionType(event.target.value)}
                  className="w-full rounded-[0.75em] border-2 border-black bg-white px-5 py-4 font-bold text-black outline-none focus:bg-gray-50"
                >
                  <option value="MINOR">Minor</option>
                  <option value="MAJOR">Major</option>
                </select>
              </label>
              <label className="space-y-2 text-base text-black">
                <span className="ml-1 text-xs font-black uppercase tracking-widest text-black/40">Description</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="min-h-32 w-full rounded-[0.75em] border-2 border-black bg-white px-5 py-4 font-bold text-black outline-none focus:bg-gray-50"
                />
              </label>
              <label className="space-y-2 text-base text-black">
                <span className="ml-1 text-xs font-black uppercase tracking-widest text-black/40">Corrected PDF</span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="block w-full text-base text-black file:mr-4 file:rounded-[0.75em] file:border-2 file:border-black file:bg-black file:px-4 file:py-3 file:font-bold file:text-white"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={isSubmitting}
                className="group inline-block cursor-pointer rounded-[0.75em] bg-black text-base font-bold disabled:opacity-60"
              >
                <span className="block -translate-y-[0.2em] rounded-[0.75em] border-2 border-black bg-black px-5 py-3 text-white transition-transform duration-100 ease-out group-hover:-translate-y-[0.33em] group-active:translate-y-0">
                  {isSubmitting ? "Submitting..." : "Submit correction"}
                </span>
              </button>
            </div>
          )}
        </form>

        <section className="rounded-[24px] border border-gray-300 bg-white p-6">
          <h2 className="text-3xl font-black tracking-tight text-black">Correction history</h2>
          {!thesis || thesis.corrections.length === 0 ? (
            <p className="mt-4 rounded-[1.5rem] border border-dashed border-gray-300 px-4 py-6 text-base font-bold text-black/40">
              No corrections submitted.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {thesis.corrections.map((correction) => (
                <article
                  key={correction.id}
                  className="rounded-[24px] border border-gray-300 bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black tracking-tight text-black">
                        {correction.correctionType} correction
                      </p>
                      <p className="mt-1 text-base font-black uppercase tracking-wider text-black/40">
                        {new Date(correction.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="rounded-full border-2 border-black bg-white px-3 py-1 text-base font-black text-black">
                      {correction.isApproved ? "Approved" : "Pending"}
                    </span>
                  </div>
                  {correction.description ? (
                    <p className="mt-3 text-base font-medium leading-6 text-black/80">
                      {correction.description}
                    </p>
                  ) : null}
                  {correction.documents.map((document) => (
                    <p key={document.id} className="mt-3 break-all text-base font-medium text-black/80">
                      {document.fileName}: {document.storagePath}
                    </p>
                  ))}
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
