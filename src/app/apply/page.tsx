import { ApplicationForm } from "@/components/application/application-form";

export default function ApplyPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#111827_100%)] px-4 py-8 text-slate-50 sm:px-6 sm:py-12">
      <ApplicationForm />
    </main>
  );
}
