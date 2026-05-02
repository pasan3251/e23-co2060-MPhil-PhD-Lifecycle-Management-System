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
        className="flex w-full items-center justify-between rounded-2xl border border-gray-300 bg-[#e0e0e0] px-6 py-3 text-base font-bold text-black shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] outline-none transition-all disabled:opacity-30"
      >
        <span className="truncate">{value ? labelMap[value] : placeholder}</span>
        <svg className={`h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-gray-300 bg-[#e0e0e0] shadow-[10px_10px_20px_#bebebe]">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => { onChange(option); setIsOpen(false); }}
              className="w-full px-6 py-3 text-left text-sm font-bold hover:bg-black hover:text-white transition-colors"
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
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to record viva outcome.");
      setMessage("Viva outcome recorded successfully.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to record viva outcome.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-10">
      <header className="pb-10 border-b-2 border-gray-300">
        <div className="space-y-4">
          <p className="text-base font-black uppercase tracking-[0.3em] text-black/40">
            Examiner Portal
          </p>
          <h1 className="text-5xl font-black tracking-tighter text-black sm:text-6xl">
            Viva Workspace
          </h1>
          <p className="max-w-2xl text-xl font-medium leading-relaxed text-black/80">
            Official evaluation workspace for assigned oral defenses. Record final
            outcomes to advance the postgraduate lifecycle.
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

      <section className="grid gap-8">
        {vivas.length === 0 ? (
          <div className="rounded-[40px] border-2 border-dashed border-gray-300 p-20 text-center">
            <p className="text-xl font-bold text-black/20 uppercase tracking-widest">No Assigned Vivas</p>
          </div>
        ) : (
          vivas.map((viva) => {
            const canRecord = viva.thesis.status === "UNDER_EXAMINATION";
            const isRecorded = Boolean(viva.outcome);

            return (
              <article
                key={viva.id}
                className="rounded-[48px] bg-[#e0e0e0] p-1 shadow-[20px_20px_40px_#bebebe,-20px_-20px_40px_#ffffff]"
              >
                <div className="p-8 sm:p-12">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-black px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                          {new Date(viva.scheduledDate).toLocaleDateString()}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-black/40">
                          {viva.venue}
                        </span>
                      </div>
                      <h2 className="text-3xl font-black tracking-tight text-black">
                        {viva.thesis.title}
                      </h2>
                      <p className="text-lg font-medium text-black/60">
                        Candidate: {viva.thesis.student.user.displayName}
                      </p>
                    </div>
                    {isRecorded ? (
                      <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50 px-6 py-2 text-sm font-black uppercase tracking-widest text-emerald-600 shadow-sm">
                        {viva.outcome?.replaceAll("_", " ")}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-gray-300 bg-white px-6 py-2 text-sm font-black uppercase tracking-widest text-black/40 shadow-sm">
                        Examination Pending
                      </div>
                    )}
                  </div>

                  <div className="mt-8 rounded-[32px] border border-gray-300 bg-[#e0e0e0] p-8 shadow-[inset_6px_6px_12px_#bebebe,inset_-6px_-6px_12px_#ffffff]">
                    <p className="text-xs font-black uppercase tracking-widest text-black/40 mb-3">Thesis Abstract</p>
                    <p className="text-base font-medium leading-relaxed text-black/70">
                      {viva.thesis.abstract}
                    </p>
                  </div>

                  {!isRecorded && (
                    <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-end">
                      <div className="flex-1 space-y-2">
                        <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-black/40">Final Outcome</span>
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
                        className="rounded-2xl bg-black px-10 py-4 text-xs font-black uppercase tracking-widest text-white shadow-[8px_8px_16px_#bebebe] transition-all hover:bg-gray-800 disabled:opacity-20 active:scale-95"
                      >
                        {busyId === viva.id ? "Recording..." : "Record Official Outcome"}
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
