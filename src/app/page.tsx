import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 py-24 text-slate-50">
      <div className="max-w-3xl space-y-8 text-center">
        <span className="inline-flex rounded-full border border-slate-700 px-4 py-1 text-sm font-medium text-slate-300">
          PB-001 Foundation Ready
        </span>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          Postgraduate Lifecycle Platform
        </h1>
        <p className="text-lg leading-8 text-slate-300">
          The foundation is laid. Navigate through the available modules below to access the application submission, dashboards, and settings.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-10">
          <Link href="/apply" className="group rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-left transition-all hover:border-slate-600 hover:bg-slate-800">
            <h3 className="text-lg font-semibold text-white group-hover:text-blue-400">Apply Now &rarr;</h3>
            <p className="mt-2 text-sm text-slate-400">Submit a new application for MPhil/PhD programs.</p>
          </Link>
          
          <Link href="/login" className="group rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-left transition-all hover:border-slate-600 hover:bg-slate-800">
            <h3 className="text-lg font-semibold text-white group-hover:text-indigo-400">Login &rarr;</h3>
            <p className="mt-2 text-sm text-slate-400">Access your account and manage personal details.</p>
          </Link>

          <Link href="/student" className="group rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-left transition-all hover:border-slate-600 hover:bg-slate-800">
            <h3 className="text-lg font-semibold text-white group-hover:text-green-400">Student Portal &rarr;</h3>
            <p className="mt-2 text-sm text-slate-400">View progress reports and manage your studies.</p>
          </Link>

          <Link href="/supervisor" className="group rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-left transition-all hover:border-slate-600 hover:bg-slate-800">
            <h3 className="text-lg font-semibold text-white group-hover:text-purple-400">Supervisor Portal &rarr;</h3>
            <p className="mt-2 text-sm text-slate-400">Manage students and review progress reports.</p>
          </Link>

          <Link href="/examiner" className="group rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-left transition-all hover:border-slate-600 hover:bg-slate-800">
            <h3 className="text-lg font-semibold text-white group-hover:text-amber-400">Examiner Portal &rarr;</h3>
            <p className="mt-2 text-sm text-slate-400">Evaluate theses and submit examination reports.</p>
          </Link>

          <Link href="/admin" className="group rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-left transition-all hover:border-slate-600 hover:bg-slate-800">
            <h3 className="text-lg font-semibold text-white group-hover:text-red-400">Admin Dashboard &rarr;</h3>
            <p className="mt-2 text-sm text-slate-400">System configuration and user management.</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
