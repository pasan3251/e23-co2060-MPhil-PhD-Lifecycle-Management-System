"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ThesisFinalizationItem = {
  id: string;
  title: string;
  status: string;
  student: {
    user: {
      displayName: string;
      email: string;
    };
  };
  corrections: Array<{
    id: string;
    correctionType: string;
    description: string | null;
    isApproved: boolean;
    createdAt: string | Date;
    documents: Array<{
      id: string;
      fileName: string;
      storagePath: string;
    }>;
  }>;
};

export function ThesisFinalizationPanel({
  theses,
}: {
  theses: ThesisFinalizationItem[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runPatch(
    path: string,
    successMessage: string,
    busyKey: string,
  ) {
    setBusyId(busyKey);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(path, {
        method: "PATCH",
        credentials: "include",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Action failed.");
      }

      setMessage(successMessage);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-12">
      <header className="border-b-2 border-gray-200 pb-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-4">
            <p className="text-base font-black uppercase tracking-[0.3em] text-black/40">
              Administration
            </p>
            <h2 className="text-5xl font-black tracking-tighter text-black sm:text-6xl">
              Thesis Management
            </h2>
            <p className="max-w-2xl font-medium text-xl leading-relaxed text-black/80">
              Oversee the final stages of the postgraduate journey, from
              correction approvals to permanent archiving.
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border-2 border-black bg-white px-6 py-4 text-base font-bold text-black shadow-[4px_4px_0px_black]">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-2xl border-2 border-black bg-white px-6 py-4 text-base font-bold text-black shadow-[4px_4px_0px_black]">
          {message}
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <p className="text-sm font-black uppercase tracking-widest text-black/40">
            Records Awaiting Finalization
          </p>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <div className="space-y-8">
          {theses.length === 0 ? (
            <div className="rounded-[30px] border-2 border-dashed border-gray-300 p-16 text-center">
              <p className="text-lg font-bold text-black/30">
                No theses are currently awaiting correction approval or archive.
              </p>
            </div>
          ) : (
            theses.map((thesis) => {
              const hasApprovedCorrection = thesis.corrections.some(
                (correction) => correction.isApproved,
              );
              const canArchive =
                thesis.status === "FINAL_ARCHIVE" ||
                (thesis.status === "CORRECTIONS_REQUIRED" &&
                  hasApprovedCorrection);

              return (
                <article
                  key={thesis.id}
                  className="rounded-[30px] border-2 border-black bg-white p-8 transition-all hover:shadow-[12px_12px_0px_black]"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <span className="inline-block rounded-lg border-2 border-black px-2 py-0.5 text-[11px] font-black uppercase tracking-wider">
                        {thesis.status.replaceAll("_", " ")}
                      </span>
                      <h3 className="text-2xl font-black tracking-tight text-black">
                        {thesis.title}
                      </h3>
                      <p className="text-lg font-medium text-black/60">
                        {thesis.student.user.displayName} •{" "}
                        {thesis.student.user.email}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={!canArchive || busyId === `archive-${thesis.id}`}
                      onClick={() =>
                        void runPatch(
                          `/api/theses/${thesis.id}/archive`,
                          "Thesis archived and student marked as graduated.",
                          `archive-${thesis.id}`,
                        )
                      }
                      className="group inline-block cursor-pointer rounded-xl bg-black text-xs font-black uppercase tracking-widest disabled:opacity-50"
                    >
                      <span className="block -translate-y-[0.2em] rounded-xl border-2 border-black bg-white box-border px-6 py-3 text-black transition-transform duration-100 ease-out group-hover:-translate-y-[0.33em] group-active:translate-y-0">
                        {busyId === `archive-${thesis.id}`
                          ? "Archiving..."
                          : "Archive & Graduate"}
                      </span>
                    </button>
                  </div>

                  <div className="mt-10 space-y-4">
                    <div className="flex items-center gap-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-black/40">
                        Submission History & Corrections
                      </p>
                      <div className="h-px flex-1 bg-gray-100" />
                    </div>

                    {thesis.corrections.length === 0 ? (
                      <p className="text-sm font-bold text-black/30 italic">
                        No correction documents submitted yet.
                      </p>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {thesis.corrections.map((correction) => (
                          <div
                            key={correction.id}
                            className="flex flex-col justify-between rounded-2xl border-2 border-gray-200 bg-gray-50 p-5 transition-colors hover:border-black/20"
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-black text-black">
                                  {correction.correctionType} Correction
                                </span>
                                <span className="text-[10px] font-bold text-black/40">
                                  {new Date(
                                    correction.createdAt,
                                  ).toLocaleDateString()}
                                </span>
                              </div>

                              {correction.description && (
                                <p className="text-xs font-medium leading-relaxed text-black/70">
                                  {correction.description}
                                </p>
                              )}

                              <div className="space-y-1">
                                {correction.documents.map((doc) => (
                                  <div
                                    key={doc.id}
                                    className="flex items-center gap-2 text-[10px] font-bold text-black/60"
                                  >
                                    <svg
                                      className="h-3 w-3"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="3"
                                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                                      />
                                    </svg>
                                    <span className="truncate">
                                      {doc.fileName}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="mt-6">
                              <button
                                type="button"
                                disabled={
                                  correction.isApproved ||
                                  busyId === `approve-${correction.id}`
                                }
                                onClick={() =>
                                  void runPatch(
                                    `/api/theses/${thesis.id}/corrections/${correction.id}/approve`,
                                    "Correction approved.",
                                    `approve-${correction.id}`,
                                  )
                                }
                                className={`w-full rounded-xl border-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                                  correction.isApproved
                                    ? "border-black bg-black text-white"
                                    : "border-black bg-white text-black hover:bg-black hover:text-white disabled:opacity-30"
                                }`}
                              >
                                {correction.isApproved
                                  ? "✓ Approved"
                                  : busyId === `approve-${correction.id}`
                                    ? "Approving..."
                                    : "Approve Correction"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

