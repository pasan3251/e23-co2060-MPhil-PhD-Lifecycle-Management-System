"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent } from "react";

import {
  thesisSubmissionSchema,
  uploadedPdfDocumentSchema,
} from "@/lib/theses/schemas";

type ThesisDocument = {
  id: string;
  fileName: string;
  storagePath: string;
  version: number;
  isCurrentVersion: boolean;
  createdAt: string | Date;
};

type ThesisSummary = {
  id: string;
  title: string;
  abstract: string;
  status: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  documents: ThesisDocument[];
} | null;

export function ThesisSubmissionPanel({ thesis }: { thesis: ThesisSummary }) {
  const router = useRouter();
  const [title, setTitle] = useState(thesis?.title ?? "");
  const [abstract, setAbstract] = useState(thesis?.abstract ?? "");
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
          "Choose a valid PDF thesis document.",
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
    setMessage(null);
    setError(null);

    if (!file) {
      setError("Choose a PDF thesis document first.");
      return;
    }

    const parsedSubmission = thesisSubmissionSchema.safeParse({
      title,
      abstract,
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
          "Invalid thesis submission details.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/theses", {
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
          version: number;
        };
      };

      if (!response.ok || !payload.upload?.signedUrl) {
        throw new Error(payload.error ?? "Unable to submit the thesis.");
      }

      const uploadResponse = await fetch(payload.upload.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("The thesis record was created, but the PDF upload failed.");
      }

      setMessage(`Thesis version ${payload.upload.version} submitted successfully.`);
      setFile(null);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Thesis submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="space-y-12">
      <section className="border-b-2 border-gray-200 pb-10">
        <p className="text-base font-black uppercase tracking-[0.3em] text-black/40">
          Thesis Submission
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-5xl font-black tracking-tighter text-black sm:text-6xl">
              Submit final thesis
            </h1>
            <p className="mt-3 max-w-3xl text-xl font-medium leading-relaxed text-black/80">
              Upload the final PDF manuscript for examination. Resubmissions
              create a new document version while keeping prior files visible.
            </p>
          </div>
          {thesis ? (
            <span className="rounded-full border-2 border-black bg-white px-3 py-1 text-base font-black uppercase tracking-wider text-black">
              {thesis.status.replaceAll("_", " ")}
            </span>
          ) : null}
        </div>
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

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-[24px] border border-gray-300 bg-white p-6"
        >
          <h2 className="text-3xl font-black tracking-tight text-black">
            {thesis ? "Submit a thesis revision" : "Create thesis submission"}
          </h2>
          <div className="mt-5 grid gap-4">
            <label className="space-y-2 text-base text-black">
              <span className="ml-1 text-xs font-black uppercase tracking-widest text-black/40">Thesis title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-[0.75em] border-2 border-black bg-white px-5 py-4 font-bold text-black outline-none focus:bg-gray-50"
                required
              />
            </label>
            <label className="space-y-2 text-base text-black">
              <span className="ml-1 text-xs font-black uppercase tracking-widest text-black/40">Abstract</span>
              <textarea
                value={abstract}
                onChange={(event) => setAbstract(event.target.value)}
                className="min-h-40 w-full rounded-[0.75em] border-2 border-black bg-white px-5 py-4 font-bold text-black outline-none focus:bg-gray-50"
                required
              />
            </label>
            <label className="space-y-2 text-base text-black">
              <span className="ml-1 text-xs font-black uppercase tracking-widest text-black/40">Thesis PDF</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="block w-full text-base text-black file:mr-4 file:rounded-[0.75em] file:border-2 file:border-black file:bg-black file:px-4 file:py-3 file:font-bold file:text-white"
                required
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="group mt-6 inline-block cursor-pointer rounded-[0.75em] bg-black text-base font-bold disabled:opacity-60"
          >
            <span className="block -translate-y-[0.2em] rounded-[0.75em] border-2 border-black bg-black px-5 py-3 text-white transition-transform duration-100 ease-out group-hover:-translate-y-[0.33em] group-active:translate-y-0">
              {isSubmitting ? "Submitting..." : thesis ? "Submit revision" : "Submit thesis"}
            </span>
          </button>
        </form>

        <section className="rounded-[24px] border border-gray-300 bg-white p-6">
          <h2 className="text-3xl font-black tracking-tight text-black">Thesis record</h2>
          {!thesis ? (
            <p className="mt-4 rounded-[1.5rem] border border-dashed border-gray-300 px-4 py-6 text-base font-bold text-black/40">
              No thesis has been submitted yet.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-[24px] border border-gray-300 bg-white p-5">
                <p className="text-base font-black uppercase tracking-[0.18em] text-black/40">
                  Thesis ID
                </p>
                <p className="mt-1 break-all text-base font-bold text-black/70">{thesis.id}</p>
                <h3 className="mt-4 text-2xl font-black tracking-tight text-black">{thesis.title}</h3>
                <p className="mt-2 whitespace-pre-wrap text-base font-medium leading-6 text-black/80">
                  {thesis.abstract}
                </p>
              </div>
              {thesis.documents.map((document) => (
                <article
                  key={document.id}
                  className="rounded-[24px] border border-gray-300 bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black tracking-tight text-black">{document.fileName}</p>
                      <p className="mt-1 text-base font-black uppercase tracking-[0.18em] text-black/40">
                        Version {document.version}
                      </p>
                    </div>
                    <span className="rounded-full border-2 border-black bg-white px-3 py-1 text-base font-black text-black">
                      {document.isCurrentVersion ? "Current" : "Previous"}
                    </span>
                  </div>
                  <p className="mt-3 break-all text-base font-medium text-black/80">
                    {document.storagePath}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
