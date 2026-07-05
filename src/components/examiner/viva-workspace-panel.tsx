"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

type ExaminerViva = {
  id: string;
  scheduledDate: string | Date;
  venue: string;
  outcome: string | null;
  thesis: {
    id: string;
    title: string;
    abstract: string;
    status: string;
    student: {
      user: {
        displayName: string;
        email: string;
      };
    };
  };
};

type ThesisDownloadResponse = {
  error?: string;
  downloadUrl?: string;
  document?: {
    fileName: string;
  };
};

interface CustomSelectProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly T[];
  labelMap: Record<T, string>;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

function CustomSelect<T extends string>({
  value,
  onChange,
  options,
  labelMap,
  className = "",
  placeholder = "Select...",
  disabled = false,
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-2xl border-2 border-black bg-white px-6 py-3 text-base font-black text-black outline-none transition-all hover:bg-gray-50 focus:ring-4 focus:ring-black/5 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <span className="truncate">{value ? labelMap[value] : placeholder}</span>
        <svg className={`h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border-2 border-black bg-white shadow-none">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => { onChange(option); setIsOpen(false); }}
              className="w-full px-6 py-3 text-left text-sm font-bold transition-colors hover:bg-black hover:text-white"
            >
              {labelMap[option]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function VivaWorkspacePanel({ vivas }: { vivas: ExaminerViva[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [downloadingThesisId, setDownloadingThesisId] = useState<string | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const outcomes = ["PASS", "MINOR_CORRECTIONS", "MAJOR_CORRECTIONS", "FAIL"] as const;
  const outcomeLabels: Record<string, string> = {
    PASS: "Pass",
    MINOR_CORRECTIONS: "Minor Corrections",
    MAJOR_CORRECTIONS: "Major Corrections",
    FAIL: "Fail",
  };

  async function recordOutcome(vivaId: string) {
    const outcome = selectedOutcome[vivaId];
    if (!outcome) {
      setError("Select an outcome before recording the viva result.");
      return;
    }
    setBusyId(vivaId);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/vivas/${vivaId}/outcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ outcome }),
      });
      const payload = (await response.json()) as {
        error?: string;
        requiresAdministrativeApproval?: boolean;
      };
      if (!response.ok) throw new Error(payload.error ?? "Unable to record viva outcome.");
      setMessage(
        payload.requiresAdministrativeApproval
          ? "Viva outcome recorded. Final archive is waiting for administrator approval."
          : "Viva outcome recorded successfully.",
      );
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to record viva outcome.");
    } finally {
      setBusyId(null);
    }
  }

  async function downloadThesis(thesisId: string) {
    setDownloadingThesisId(thesisId);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/theses/${thesisId}/download`, {
        credentials: "include",
      });
      const payload = (await response.json()) as ThesisDownloadResponse;

      if (!response.ok || !payload.downloadUrl) {
        throw new Error(payload.error ?? "Unable to prepare the thesis download.");
      }

      window.open(payload.downloadUrl, "_blank", "noopener,noreferrer");
      setMessage(
        payload.document?.fileName
          ? `Secure download opened for ${payload.document.fileName}.`
          : "Secure thesis download opened.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to open thesis download.");
    } finally {
      setDownloadingThesisId(null);
    }
  }

  return (
    <div className="space-y-12">
      <header className="border-b-2 border-gray-200 pb-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-4">
            <p className="text-base font-black uppercase tracking-[0.3em] text-black/40">
              Vivas
            </p>
            <h1 className="text-5xl font-black tracking-tighter text-black sm:text-6xl">
              Assigned Vivas
            </h1>
            <p className="max-w-2xl text-xl font-medium leading-relaxed text-black/80">
              Review thesis documents and record final examination outcomes.
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border-2 border-black bg-white px-6 py-4 text-base font-bold text-black shadow-[4px_4px_0px_black]">
          <p>{error}</p>
        </div>
      )}

      {message && (
        <div className="rounded-2xl border-2 border-black bg-white px-6 py-4 text-base font-bold text-black shadow-[4px_4px_0px_black]">
          <p>{message}</p>
        </div>
      )}

      <section className="grid gap-8">
        {vivas.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-gray-300 bg-white p-20 text-center">
            <p className="text-3xl font-black tracking-tight text-black">No assigned vivas</p>
            <p className="mt-3 text-base font-medium text-black/70">
              Scheduled vivas will appear here.
            </p>
          </div>
        ) : (
          vivas.map((viva) => {
            const canRecord = viva.thesis.status === "UNDER_EXAMINATION";
            const isRecorded = Boolean(viva.outcome);

            return (
              <article
                key={viva.id}
                className="group rounded-[24px] border border-gray-300 bg-white p-6 transition-all hover:bg-black"
              >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="rounded-full border-2 border-black bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-black transition-colors group-hover:border-white group-hover:bg-transparent group-hover:text-white">
                        {new Date(viva.scheduledDate).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-black/40 transition-colors group-hover:text-white/60">
                        {viva.venue}
                      </span>
                    </div>
                    <h2 className="text-3xl font-black tracking-tight text-black transition-colors group-hover:text-white">
                      {viva.thesis.title}
                    </h2>
                    <p className="text-lg font-medium text-black/70 transition-colors group-hover:text-white/80">
                      Candidate: {viva.thesis.student.user.displayName}
                    </p>
                  </div>
                  {isRecorded ? (
                    <div className="rounded-full border-2 border-black bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-black">
                      {viva.outcome?.replaceAll("_", " ")}
                    </div>
                  ) : (
                    <div className="rounded-full border border-gray-300 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-black/40">
                      Examination Pending
                    </div>
                  )}
                </div>

                <div className="mt-8 rounded-[24px] border border-gray-300 bg-white p-6 transition-colors group-hover:border-white/30 group-hover:bg-transparent">
                  <p className="mb-3 text-xs font-black uppercase tracking-widest text-black/40 transition-colors group-hover:text-white/60">Thesis Abstract</p>
                  <p className="text-base font-medium leading-relaxed text-black/70 transition-colors group-hover:text-white/80">
                    {viva.thesis.abstract}
                  </p>
                </div>

                <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end">
                  <button
                    type="button"
                    onClick={() => void downloadThesis(viva.thesis.id)}
                    disabled={downloadingThesisId === viva.thesis.id}
                    className="rounded-xl border-2 border-black bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-black transition group-hover:border-white group-hover:bg-transparent group-hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {downloadingThesisId === viva.thesis.id
                      ? "Opening..."
                      : "Download Thesis"}
                  </button>

                  {!isRecorded ? (
                    <>
                    <div className="flex-1 space-y-2">
                      <span className="ml-1 text-[10px] font-black uppercase tracking-widest text-black/40 transition-colors group-hover:text-white/60">Final Outcome</span>
                      <CustomSelect
                        value={selectedOutcome[viva.id] ?? ""}
                        onChange={(val) => setSelectedOutcome(c => ({...c, [viva.id]: val}))}
                        options={outcomes}
                        labelMap={outcomeLabels}
                        disabled={!canRecord}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={!canRecord || busyId === viva.id || !selectedOutcome[viva.id]}
                      onClick={() => void recordOutcome(viva.id)}
                      className="group inline-block cursor-pointer rounded-[0.75em] bg-black text-xs font-bold uppercase tracking-widest disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="block -translate-y-[0.2em] rounded-[0.75em] border-2 border-black bg-black px-8 py-3 text-white transition-transform duration-100 ease-out group-hover:-translate-y-[0.33em] group-active:translate-y-0">
                        {busyId === viva.id ? "Recording..." : "Record Outcome"}
                      </span>
                    </button>
                    </>
                  ) : null}
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
