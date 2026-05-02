import { ApplicationReviewPanel } from "@/components/admin/application-review-panel";

export default function AdminApplicationReviewPage({ params }: { params: { id: string } }) {
  return (
    <main className="h-full overflow-y-auto px-2 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-4xl">
        <ApplicationReviewPanel applicationId={params.id} />
      </div>
    </main>
  );
}
