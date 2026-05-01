import { SupervisorStudentProfile } from "@/components/supervisor/supervisor-student-profile";

export default function SupervisorStudentProfilePage({
  params,
}: {
  params: { id: string };
}) {
  return <SupervisorStudentProfile studentId={params.id} />;
}
