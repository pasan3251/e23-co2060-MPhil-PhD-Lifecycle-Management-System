"use client";

import { useState } from "react";
import useSWR from "swr";

async function fetcher(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to load reports");
  return response.json();
}

export function ProgressReportSignoffList() {
  const { data, error, mutate, isLoading } = useSWR("/api/supervisor/progress-reports", fetcher);
  const [signingId, setSigningId] = useState<string | null>(null);

  async function handleSign(reportId: string) {
    setSigningId(reportId);
    try {
      const response = await fetch(`/api/supervisor/progress-reports/${reportId}/sign`, {
        method: "POST",
      });
      if (response.ok) {
        mutate();
      } else {
        const payload = await response.json();
        alert(payload.error || "Failed to sign report");
      }
    } catch (err) {
      alert("A network error occurred");
    } finally {
      setSigningId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="mt-8 space-y-4">
        <div className="h-28 animate-pulse rounded-[24px] border border-gray-300 bg-white" />
        <div className="h-28 animate-pulse rounded-[24px] border border-gray-300 bg-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 rounded-2xl border-2 border-black bg-white px-6 py-4 text-base font-bold text-black shadow-[4px_4px_0px_black]">
        Error loading reports.
      </div>
    );
  }

  const reports = data?.reports || [];

  if (reports.length === 0) {
    return (
      <div className="mt-8 rounded-[24px] border border-dashed border-gray-300 bg-white p-12 text-center">
        <p className="text-2xl font-black tracking-tight text-black">No reports pending</p>
        <p className="mt-2 text-base font-medium text-black/70">
        No progress reports need your sign-off.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      {reports.map((report: any) => (
        <article key={report.id} className="group rounded-[24px] border border-gray-300 bg-white p-6 transition-all hover:bg-black">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className="text-[14px] font-black uppercase tracking-[0.2em] text-black/40 transition-colors group-hover:text-white/70">
                  {report.periodLabel}
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-black/40 transition-colors group-hover:text-white/60">
                  Submitted {new Date(report.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h4 className="mt-2 text-2xl font-black tracking-tight text-black transition-colors group-hover:text-white">
                {report.student.displayName}
              </h4>
              <p className="mt-3 whitespace-pre-wrap text-base font-medium leading-6 text-black/70 transition-colors group-hover:text-white/80">
                {report.narrative}
              </p>
            </div>
            <button
              onClick={() => handleSign(report.id)}
              disabled={signingId === report.id}
              className="shrink-0 rounded-xl border-2 border-black bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-black transition group-hover:border-white group-hover:bg-transparent group-hover:text-white disabled:opacity-50"
            >
              {signingId === report.id ? "Signing..." : "Sign Off"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
