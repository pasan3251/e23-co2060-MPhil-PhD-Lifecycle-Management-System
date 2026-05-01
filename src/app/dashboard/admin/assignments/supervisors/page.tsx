import { SupervisorAssignmentPanel } from "@/components/admin/supervisor-assignment-panel";

export default function AdminSupervisorAssignmentPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <SupervisorAssignmentPanel />
      </div>
    </main>
  );
}
