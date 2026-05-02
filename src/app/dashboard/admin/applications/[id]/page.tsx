import { ApplicationReviewPanel } from "@/components/admin/application-review-panel";

export default function AdminApplicationReviewPage({ params }: { params: { id: string } }) {
  return (
    <main className="h-full overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <ApplicationReviewPanel applicationId={params.id} />
      </div>
    </main>
  );
}
