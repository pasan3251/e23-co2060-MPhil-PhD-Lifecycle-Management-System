import Link from "next/link";
import { ProgressReportList } from "@/components/progress-reports/progress-report-list";

export default function ProgressReportsHistoryPage() {
  return (
    <main className="space-y-6">
      <section className="rounded-[2rem] border border-gray-200 bg-white/70 p-6 shadow-xl sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black">
              Academic Records
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
              Progress Reports
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-black">
              Review your periodic narrative reports and track their supervisor 
              sign-off status.
            </p>
          </div>
          <Link
            href="/dashboard/student/progress-reports/submit"
            className="inline-flex items-center justify-center rounded-2xl bg-black px-6 py-3 text-sm font-semibold text-black transition hover:bg-black"
          >
            Submit New Report
          </Link>
        </div>

        <ProgressReportList />
      </section>
    </main>
  );
}
