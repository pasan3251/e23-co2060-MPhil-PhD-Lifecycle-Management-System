type DashboardPageProps = {
  params: {
    role: string;
  };
};

export default function DashboardRolePage({ params }: DashboardPageProps) {
  const isAdmin = params.role === "admin";

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-20 text-black">
      <div className="rounded-[2rem] border border-gray-200 bg-gray-50/70 px-8 py-10 text-center shadow-[0_30px_80px_rgba(2,6,23,0.45)]">
        <p className="text-sm uppercase tracking-[0.18em] text-black">
          Dashboard
        </p>
        <h1 className="mt-3 text-3xl font-semibold capitalize">
          {params.role} workspace
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-6 text-black">
          This role landing page confirms the authenticated redirect path for PB-010.
        </p>
        {isAdmin ? (
          <a
            href="/dashboard/admin/users"
            className="mt-6 inline-flex rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-black transition hover:bg-black"
          >
            Open user management
          </a>
        ) : null}
      </div>
    </main>
  );
}
