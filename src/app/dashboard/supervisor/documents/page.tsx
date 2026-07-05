import { DocumentRepositoryPanel } from "@/components/documents/document-repository-panel";
import { getServerDashboardContext } from "@/lib/dashboard/server";

export default async function SupervisorDocumentsPage() {
  await getServerDashboardContext("supervisor");

  return <DocumentRepositoryPanel role="supervisor" />;
}
