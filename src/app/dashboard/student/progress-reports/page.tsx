import Link from "next/link";
import { ProgressReportList } from "@/components/progress-reports/progress-report-list";

export default function ProgressReportsHistoryPage() {
  return (
    <main className="space-y-12">
      <section className="border-b-2 border-gray-200 pb-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base font-black uppercase tracking-[0.3em] text-black/40">
              Reports
            </p>
            <h1 className="mt-3 text-5xl font-black tracking-tighter text-black sm:text-6xl">
              Progress Reports
            </h1>
            <p className="mt-3 max-w-2xl text-xl font-medium leading-relaxed text-black/80">
              Review submitted reports and sign-off status.
            </p>
          </div>
          <Link
            href="/dashboard/student/progress-reports/submit"
            className="group inline-block cursor-pointer rounded-[0.75em] bg-black text-base font-bold"
          >
            <span className="block -translate-y-[0.2em] rounded-[0.75em] border-2 border-black bg-black px-[1.5em] py-[0.75em] text-white transition-transform duration-100 ease-out group-hover:-translate-y-[0.33em] group-active:translate-y-0">
              Submit Report
            </span>
          </Link>
        </div>
      </section>

      <ProgressReportList />
    </main>
  );
}
