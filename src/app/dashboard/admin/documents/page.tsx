import { DocumentRepositoryPanel } from "@/components/documents/document-repository-panel";
import { getServerDashboardContext } from "@/lib/dashboard/server";

export default async function AdminDocumentsPage() {
  await getServerDashboardContext("admin");

  return <DocumentRepositoryPanel role="admin" />;
}
