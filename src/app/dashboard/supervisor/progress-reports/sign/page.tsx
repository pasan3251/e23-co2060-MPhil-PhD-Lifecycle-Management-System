import { ProgressReportSignoffList } from "@/components/supervisor/progress-report-signoff-list";

export default function SignProgressReportsPage() {
  return (
    <div className="space-y-10">
      <header className="border-b-2 border-gray-200 pb-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-4">
            <p className="text-base font-black uppercase tracking-[0.3em] text-black/40">
              Progress Reports
            </p>
            <h1 className="text-5xl font-black tracking-tighter text-black sm:text-6xl">
              Sign Progress Reports
            </h1>
            <p className="max-w-2xl text-xl font-medium leading-relaxed text-black/80">
              Review student reports and sign them before panel review.
            </p>
          </div>
        </div>
      </header>

      <ProgressReportSignoffList />
    </div>
  );
}
