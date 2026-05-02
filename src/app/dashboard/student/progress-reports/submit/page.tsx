import { ProgressReportSubmissionForm } from "@/components/progress-reports/progress-report-submission-form";

export default function SubmitProgressReportPage() {
  return (
    <main className="space-y-12">
      <section className="border-b-2 border-gray-200 pb-10">
      <p className="text-base font-black uppercase tracking-[0.3em] text-black/40">
        Reports
      </p>
      <h1 className="mt-3 text-5xl font-black tracking-tighter text-black sm:text-6xl">Submit Report</h1>
      <p className="mt-3 max-w-2xl text-xl font-medium leading-relaxed text-black/80">
        Submit your latest research update. Your primary supervisor must sign it
        off before it reaches the review panel.
      </p>
      </section>

      <ProgressReportSubmissionForm />
    </main>
  );
}
