import { ProgressReportSignoffList } from "@/components/supervisor/progress-report-signoff-list";

export default function SignProgressReportsPage() {
  return (
    <div className="space-y-10">
      <header className="pb-10 border-b-2 border-gray-300">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-4">
            <p className="text-base font-black uppercase tracking-[0.3em] text-black/40">
              Supervisory Duties
            </p>
            <h1 className="text-5xl font-black tracking-tighter text-black sm:text-6xl">
              Sign Progress Reports
            </h1>
            <p className="max-w-2xl text-xl font-medium leading-relaxed text-black/80">
              Review and sign off on your students' periodic narrative reports. Once 
              signed, these reports will be forwarded to the respective review panels.
            </p>
          </div>
        </div>
      </header>

      <ProgressReportSignoffList />
    </div>
  );
}
