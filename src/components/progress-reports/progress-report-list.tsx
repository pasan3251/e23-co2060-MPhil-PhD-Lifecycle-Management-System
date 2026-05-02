"use client";

import useSWR from "swr";
import Link from "next/link";
import { ProgressReport } from "@prisma/client";

async function fetchReports(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to load reports");
  const data = await response.json();
  return data.reports as ProgressReport[];
}

export function ProgressReportList() {
  const { data: reports, error, isLoading } = useSWR(
    "/api/student/progress-reports",
    fetchReports
  );

  if (isLoading) {
    return (
      <div className="mt-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-[24px] border border-gray-300 bg-white" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 rounded-2xl border-2 border-black bg-white px-6 py-4 text-center text-base font-bold text-black shadow-[4px_4px_0px_black]">
        <p>Unable to load your progress reports.</p>
      </div>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <div className="mt-8 rounded-[24px] border border-dashed border-gray-300 bg-white px-5 py-12 text-center">
        <h3 className="text-2xl font-black tracking-tight text-black">No reports found</h3>
        <p className="mt-2 text-base font-medium text-black/70">
          You haven&apos;t submitted any progress reports yet.
        </p>
        <Link
          href="/dashboard/student/progress-reports/submit"
          className="group mt-6 inline-block cursor-pointer rounded-[0.75em] bg-black text-base font-bold"
        >
          <span className="block -translate-y-[0.2em] rounded-[0.75em] border-2 border-black bg-black px-[1.5em] py-[0.75em] text-white transition-transform duration-100 ease-out group-hover:-translate-y-[0.33em] group-active:translate-y-0">
            Submit your first report
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      {reports.map((report) => (
        <article
          key={report.id}
          className="group rounded-[24px] border border-gray-300 bg-white p-6 transition-all hover:bg-black"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[14px] font-black uppercase tracking-[0.2em] text-black/40 transition-colors group-hover:text-white/70">
                {report.periodLabel}
              </p>
              <h4 className="mt-2 text-2xl font-black tracking-tight text-black transition-colors group-hover:text-white">
                Progress Report
              </h4>
              <p className="mt-3 line-clamp-2 text-base font-medium leading-6 text-black/70 transition-colors group-hover:text-white/80">
                {report.narrative}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span
                className={`rounded-full border-2 px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-colors group-hover:border-white ${
                  report.isSupervisorSignedOff
                    ? "border-black bg-white text-black group-hover:text-black"
                    : "border-black bg-white text-black group-hover:text-black"
                }`}
              >
                {report.isSupervisorSignedOff ? "Signed Off" : "Pending Sign-off"}
              </span>
              <p className="text-[10px] font-black uppercase tracking-wider text-black/40 transition-colors group-hover:text-white/70">
                Submitted {new Date(report.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
