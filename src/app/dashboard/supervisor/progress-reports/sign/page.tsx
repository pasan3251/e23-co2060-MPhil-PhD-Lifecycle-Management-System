import { ProgressReportSignoffList } from "@/components/supervisor/progress-report-signoff-list";

export default function SignProgressReportsPage() {
  return (
    <main className="space-y-6">
      <section className="rounded-[2rem] border border-gray-200 bg-white/70 p-6 shadow-xl sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black">
          Supervisory Duties
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
          Sign Progress Reports
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-black">
          Review and sign off on your students&apos; periodic narrative reports. Once 
          signed, these reports will be forwarded to the respective review panels.
        </p>

        <ProgressReportSignoffList />
      </section>
    </main>
  );
}
