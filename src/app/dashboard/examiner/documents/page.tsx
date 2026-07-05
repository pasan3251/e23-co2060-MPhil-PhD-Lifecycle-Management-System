import { DocumentRepositoryPanel } from "@/components/documents/document-repository-panel";
import { getServerDashboardContext } from "@/lib/dashboard/server";

export default async function ExaminerDocumentsPage() {
  await getServerDashboardContext("examiner");

  return <DocumentRepositoryPanel role="examiner" />;
}
