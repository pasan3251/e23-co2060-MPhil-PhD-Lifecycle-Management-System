import { DocumentRepositoryPanel } from "@/components/documents/document-repository-panel";
import { getServerDashboardContext } from "@/lib/dashboard/server";

export default async function StudentDocumentsPage() {
  await getServerDashboardContext("student");

  return <DocumentRepositoryPanel role="student" />;
}
