import { getServerDashboardContext } from "@/lib/dashboard/server";
import { ProposalUploadForm } from "@/components/proposal/proposal-upload-form";
import { prisma } from "@/lib/prisma/client";

export default async function SubmitProposalPage() {
  const { auth } = await getServerDashboardContext("student");

  const student = await prisma.student.findUnique({
    where: { userId: auth.userId },
  });

  if (!student) {
    return <div className="p-8 text-white">Student record not found.</div>;
  }

  return (
    <main className="p-4 sm:p-8">
      <ProposalUploadForm studentId={student.id} />
    </main>
  );
}
