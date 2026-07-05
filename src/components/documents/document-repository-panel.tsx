"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

type RepositoryRole = "student" | "supervisor" | "examiner" | "admin";

type RepositoryDocument = {
  id: string;
  documentType: string;
  fileName: string;
  title: string | null;
  summary: string | null;
  tags: string[];
  mimeType: string;
  version: number;
  isCurrentVersion: boolean;
  storagePath: string;
  createdAt: string | Date;
};

type DocumentsResponse = {
  documents?: RepositoryDocument[];
  error?: string;
};

type DownloadResponse = {
  downloadUrl?: string;
  error?: string;
};

const CATEGORY_OPTIONS = [
  { value: "", label: "All categories" },
  { value: "APPLICATION_ATTACHMENT", label: "Applications" },
  { value: "PROPOSAL", label: "Proposals" },
  { value: "PROGRESS_REPORT", label: "Progress Reports" },
  { value: "THESIS", label: "Theses" },
  { value: "CORRECTION", label: "Corrections" },
];

const TAG_OPTIONS = [
  { value: "", label: "Any tag" },
  { value: "current", label: "Current version" },
  { value: "submitted", label: "Submitted" },
  { value: "under-review", label: "Under review" },
  { value: "approved", label: "Approved" },
  { value: "under-examination", label: "Under examination" },
  { value: "overdue", label: "Overdue" },
  { value: "signed-off", label: "Signed off" },
  { value: "correction", label: "Correction" },
];

function getCategoryLabel(documentType: string) {
  return (
    CATEGORY_OPTIONS.find((option) => option.value === documentType)?.label ??
    documentType.replaceAll("_", " ")
  );
}

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function buildQueryString(input: {
  q: string;
  category: string;
  tag: string;
  startDate: string;
  endDate: string;
}) {
  const params = new URLSearchParams();

  if (input.q.trim()) params.set("q", input.q.trim());
  if (input.category) params.set("category", input.category);
  if (input.tag) params.set("tag", input.tag);
  if (input.startDate) params.set("startDate", input.startDate);
  if (input.endDate) params.set("endDate", input.endDate);

  return params.toString();
}

export function DocumentRepositoryPanel({ role }: { role: RepositoryRole }) {
  const [documents, setDocuments] = useState<RepositoryDocument[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState(role === "examiner" ? "THESIS" : "");
  const [tag, setTag] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categoryOptions = useMemo(
    () =>
      role === "examiner"
        ? CATEGORY_OPTIONS.filter((option) => option.value === "" || option.value === "THESIS")
        : CATEGORY_OPTIONS,
    [role],
  );

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const queryString = buildQueryString({
        q,
        category,
        tag,
        startDate,
        endDate,
      });
      const response = await fetch(`/api/documents${queryString ? `?${queryString}` : ""}`, {
        credentials: "include",
      });
      const payload = (await response.json()) as DocumentsResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load documents.");
      }

      setDocuments(payload.documents ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load documents.");
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  }, [category, endDate, q, startDate, tag]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadDocuments();
  }

  async function handleDownload(document: RepositoryDocument) {
    setBusyId(`download-${document.id}`);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        credentials: "include",
      });
      const payload = (await response.json()) as DownloadResponse;

      if (!response.ok || !payload.downloadUrl) {
        throw new Error(payload.error ?? "Unable to prepare the document download.");
      }

      window.open(payload.downloadUrl, "_blank", "noopener,noreferrer");
      setMessage(`Secure download opened for ${document.fileName}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to open document download.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleArchive(document: RepositoryDocument) {
    setBusyId(`archive-${document.id}`);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: "PATCH",
        credentials: "include",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to archive the document.");
      }

      setDocuments((current) => current.filter((item) => item.id !== document.id));
      setMessage(`${document.fileName} archived from the repository.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to archive document.");
    } finally {
      setBusyId(null);
    }
  }

  function resetFilters() {
    setQ("");
    setCategory(role === "examiner" ? "THESIS" : "");
    setTag("");
    setStartDate("");
    setEndDate("");
  }

  return (
    <div className="space-y-12">
      <header className="border-b-2 border-gray-200 pb-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-4">
            <p className="text-base font-black uppercase tracking-[0.3em] text-black/40">
              Repository
            </p>
            <h1 className="text-5xl font-black tracking-tighter text-black sm:text-6xl">
              Document Repository
            </h1>
            <p className="max-w-2xl text-xl font-medium leading-relaxed text-black/80">
              Search lifecycle documents, open secure downloads, and manage archive visibility.
            </p>
          </div>
          <span className="rounded-full border-2 border-black bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-black">
            {documents.length} visible
          </span>
        </div>
      </header>

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

      <form
        onSubmit={handleSearch}
        className="rounded-[24px] border border-gray-300 bg-white p-6"
      >
        <div className="grid gap-5 lg:grid-cols-[1.4fr_0.9fr_0.9fr]">
          <label className="space-y-2">
            <span className="ml-1 text-xs font-black uppercase tracking-widest text-black/40">
              Search
            </span>
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Filename, title, abstract, period..."
              className="w-full rounded-2xl border-2 border-black bg-white px-6 py-3 text-base font-black text-black outline-none transition-all hover:bg-gray-50 focus:ring-4 focus:ring-black/5"
            />
          </label>

          <label className="space-y-2">
            <span className="ml-1 text-xs font-black uppercase tracking-widest text-black/40">
              Category
            </span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full rounded-2xl border-2 border-black bg-white px-6 py-3 text-base font-black text-black outline-none transition-all hover:bg-gray-50 focus:ring-4 focus:ring-black/5"
            >
              {categoryOptions.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="ml-1 text-xs font-black uppercase tracking-widest text-black/40">
              Tag
            </span>
            <select
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              className="w-full rounded-2xl border-2 border-black bg-white px-6 py-3 text-base font-black text-black outline-none transition-all hover:bg-gray-50 focus:ring-4 focus:ring-black/5"
            >
              {TAG_OPTIONS.map((option) => (
                <option key={option.value || "any"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
          <label className="space-y-2">
            <span className="ml-1 text-xs font-black uppercase tracking-widest text-black/40">
              From
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full rounded-2xl border-2 border-black bg-white px-6 py-3 text-base font-black text-black outline-none transition-all hover:bg-gray-50 focus:ring-4 focus:ring-black/5"
            />
          </label>

          <label className="space-y-2">
            <span className="ml-1 text-xs font-black uppercase tracking-widest text-black/40">
              To
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full rounded-2xl border-2 border-black bg-white px-6 py-3 text-base font-black text-black outline-none transition-all hover:bg-gray-50 focus:ring-4 focus:ring-black/5"
            />
          </label>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl border-2 border-black bg-white px-6 py-3 text-xs font-black uppercase tracking-widest text-black transition hover:bg-black hover:text-white"
          >
            Reset
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className="group inline-block cursor-pointer rounded-[0.75em] bg-black text-xs font-bold uppercase tracking-widest disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="block -translate-y-[0.2em] rounded-[0.75em] border-2 border-black bg-black px-8 py-3 text-white transition-transform duration-100 ease-out group-hover:-translate-y-[0.33em] group-active:translate-y-0">
              {isLoading ? "Searching..." : "Search"}
            </span>
          </button>
        </div>
      </form>

      <section className="rounded-[24px] border border-gray-300 bg-white p-4 sm:p-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-20 animate-pulse rounded-[20px] bg-gray-100" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-gray-300 bg-white px-5 py-16 text-center">
            <p className="text-3xl font-black tracking-tight text-black">No documents found</p>
            <p className="mt-3 text-base font-medium text-black/70">
              Try a broader search or clear the filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr>
                  <th className="px-4 pb-5 text-xs font-black uppercase tracking-[0.2em] text-black/40">
                    Document
                  </th>
                  <th className="px-4 pb-5 text-xs font-black uppercase tracking-[0.2em] text-black/40">
                    Category
                  </th>
                  <th className="px-4 pb-5 text-xs font-black uppercase tracking-[0.2em] text-black/40">
                    Tags
                  </th>
                  <th className="px-4 pb-5 text-xs font-black uppercase tracking-[0.2em] text-black/40">
                    Added
                  </th>
                  <th className="px-4 pb-5 text-right text-xs font-black uppercase tracking-[0.2em] text-black/40">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {documents.map((document) => (
                  <tr key={document.id} className="group transition-colors hover:bg-black">
                    <td className="px-4 py-6 align-top">
                      <div className="font-black text-black transition-colors group-hover:text-white">
                        {document.title ?? document.fileName}
                      </div>
                      <p className="mt-1 break-all text-sm font-bold text-black/60 transition-colors group-hover:text-white/80">
                        {document.fileName}
                      </p>
                      {document.summary ? (
                        <p className="mt-2 line-clamp-2 max-w-xl text-sm font-medium text-black/60 transition-colors group-hover:text-white/70">
                          {document.summary}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-6 align-top">
                      <span className="rounded-full border-2 border-black bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-black">
                        {getCategoryLabel(document.documentType)}
                      </span>
                      <p className="mt-2 text-xs font-bold text-black/40 transition-colors group-hover:text-white/60">
                        Version {document.version}
                        {document.isCurrentVersion ? " - Current" : ""}
                      </p>
                    </td>
                    <td className="px-4 py-6 align-top">
                      <div className="flex max-w-sm flex-wrap gap-2">
                        {document.tags.map((item) => (
                          <span
                            key={`${document.id}-${item}`}
                            className="rounded-full border border-gray-300 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-wider text-black/50 transition-colors group-hover:border-white/30 group-hover:bg-transparent group-hover:text-white/70"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-6 align-top text-sm font-bold text-black/60 transition-colors group-hover:text-white/80">
                      {formatDate(document.createdAt)}
                    </td>
                    <td className="px-4 py-6 align-top">
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => void handleDownload(document)}
                          disabled={busyId === `download-${document.id}`}
                          className="rounded-xl border-2 border-black bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-black transition group-hover:border-white group-hover:bg-transparent group-hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busyId === `download-${document.id}` ? "Opening..." : "Download"}
                        </button>
                        {role === "admin" ? (
                          <button
                            type="button"
                            onClick={() => void handleArchive(document)}
                            disabled={busyId === `archive-${document.id}`}
                            className="rounded-xl border-2 border-black bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-black transition group-hover:border-white group-hover:bg-transparent group-hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {busyId === `archive-${document.id}` ? "Archiving..." : "Archive"}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
