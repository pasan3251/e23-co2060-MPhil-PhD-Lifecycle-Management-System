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
    <div className="space-y-10">
      <header className="pb-10 border-b-2 border-gray-300">
        <div className="space-y-4">
          <p className="text-base font-black uppercase tracking-[0.3em] text-black/40">
            Thesis Management
          </p>
          <h2 className="text-5xl font-black tracking-tighter text-black sm:text-6xl">
            Records Awaiting Archive
          </h2>
          <p className="max-w-2xl text-xl font-medium leading-relaxed text-black/80">
            Oversee the final stages of the postgraduate journey, from 
            correction approvals to permanent repository archiving.
          </p>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-600 shadow-[inset_4px_4px_8px_#fca5a5,inset_-4px_-4px_8px_#ffffff]">
          <p className="font-bold">{error}</p>
        </div>
      )}

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-600 shadow-[inset_4px_4px_8px_#a7f3d0,inset_-4px_-4px_8px_#ffffff]">
          <p className="font-bold">{message}</p>
        </div>
      )}

      <div className="space-y-10">
        {theses.length === 0 ? (
          <div className="rounded-[40px] border-2 border-dashed border-gray-300 p-20 text-center">
            <p className="text-xl font-bold text-black/20 uppercase tracking-widest">Repository Cleared</p>
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
                className="rounded-[48px] bg-[#e0e0e0] p-1 shadow-[20px_20px_40px_#bebebe,-20px_-20px_40px_#ffffff]"
              >
                <div className="p-8 sm:p-12">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <span className="inline-block rounded-full border border-black px-3 py-1 text-[10px] font-black uppercase tracking-widest text-black">
                        {thesis.status.replaceAll("_", " ")}
                      </span>
                      <h3 className="text-3xl font-black tracking-tight text-black">
                        {thesis.title}
                      </h3>
                      <p className="text-lg font-medium text-black/60">
                        Candidate: {thesis.student.user.displayName} • {thesis.student.user.email}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={!canArchive || busyId === `archive-${thesis.id}`}
                      onClick={() =>
                        void runPatch(
                          `/api/theses/${thesis.id}/archive`,
                          "Thesis successfully archived and student graduated.",
                          `archive-${thesis.id}`,
                        )
                      }
                      className="rounded-2xl bg-black px-8 py-4 text-xs font-black uppercase tracking-widest text-white shadow-[8px_8px_16px_#bebebe] transition-all hover:bg-gray-800 disabled:opacity-20 active:scale-95"
                    >
                      {busyId === `archive-${thesis.id}`
                        ? "Archiving..."
                        : "Archive & Graduate"}
                    </button>
                  </div>

                  <div className="mt-12 space-y-6">
                    <div className="flex items-center gap-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-black/40">
                        Correction Workflow
                      </p>
                      <div className="h-px flex-1 bg-gray-300" />
                    </div>

                    {thesis.corrections.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-gray-400 p-8 text-center">
                        <p className="text-sm font-bold text-black/30 uppercase tracking-widest">Awaiting Correction Documents</p>
                      </div>
                    ) : (
                      <div className="grid gap-6 sm:grid-cols-2">
                        {thesis.corrections.map((correction) => (
                          <div
                            key={correction.id}
                            className="flex flex-col justify-between rounded-[32px] border border-gray-300 bg-[#e0e0e0] p-8 shadow-[inset_6px_6px_12px_#bebebe,inset_-6px_-6px_12px_#ffffff]"
                          >
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-black uppercase tracking-widest ${correction.isApproved ? 'text-emerald-600' : 'text-black'}`}>
                                  {correction.correctionType} Correction
                                </span>
                                <span className="text-[10px] font-bold text-black/40">
                                  {new Date(correction.createdAt).toLocaleDateString()}
                                </span>
                              </div>

                              {correction.description && (
                                <p className="text-sm font-medium leading-relaxed text-black/70 italic">
                                  "{correction.description}"
                                </p>
                              )}

                              <div className="space-y-2">
                                {correction.documents.map((doc) => (
                                  <div key={doc.id} className="flex items-center gap-3 rounded-xl bg-black/5 px-4 py-3">
                                    <svg className="h-4 w-4 text-black/40" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-xs font-bold text-black truncate">{doc.fileName}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="mt-8">
                              <button
                                type="button"
                                disabled={correction.isApproved || busyId === `approve-${correction.id}`}
                                onClick={() =>
                                  void runPatch(
                                    `/api/theses/${thesis.id}/corrections/${correction.id}/approve`,
                                    "Correction approved.",
                                    `approve-${correction.id}`,
                                  )
                                }
                                className={`w-full rounded-2xl py-4 text-[10px] font-black uppercase tracking-widest transition-all ${
                                  correction.isApproved
                                    ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                                    : "bg-black text-white shadow-[6px_6px_12px_#bebebe] hover:bg-gray-800 active:scale-95 disabled:opacity-20"
                                }`}
                              >
                                {correction.isApproved
                                  ? "Verified Approved"
                                  : busyId === `approve-${correction.id}`
                                    ? "Validating..."
                                    : "Approve Correction"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
