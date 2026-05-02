"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Montserrat } from "next/font/google";

import { buildDashboardPageMeta } from "@/lib/dashboard/page-meta";
import type { DashboardRole } from "@/types/dashboard";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

type DashboardRoleLayoutProps = {
  role: DashboardRole;
  children: ReactNode;
};

export function DashboardRoleLayout({
  role,
  children,
}: DashboardRoleLayoutProps) {
  const pathname = usePathname();
  const meta = buildDashboardPageMeta(role);
  const isAdmin = role === "admin";
  const heading = isAdmin ? "Administrator Dashboard" : meta.heading;
  const navItemClassName =
    "group block rounded-2xl border px-5 py-4 text-base font-bold transition-all";

  function getNavItemClassName(href: string) {
    const isActive =
      pathname === href || (href !== `/dashboard/${role}` && pathname.startsWith(`${href}/`));

    if (isActive) {
      return `${navItemClassName} border-gray-400 bg-gray-300 text-black`;
    }

    return `${navItemClassName} border-gray-300 bg-transparent text-black hover:bg-black hover:text-white`;
  }

  return (
    <div className={`${montserrat.className} h-[100dvh] overflow-hidden bg-[#e0e0e0] text-black`}>
      <div className="box-border flex h-full w-full flex-col overflow-hidden px-4 py-4 sm:px-6 sm:py-6 lg:flex-row lg:gap-8">
        <aside className="mb-4 shrink-0 overflow-y-auto rounded-[30px] bg-[#e0e0e0] p-6 shadow-[15px_15px_30px_#bebebe,-15px_-15px_30px_#ffffff] lg:mb-0 lg:w-72 lg:p-8">
          {!isAdmin ? (
            <p className="text-base font-bold uppercase tracking-[0.28em] text-black">
              {meta.eyebrow}
            </p>
          ) : null}
          <h1 className={`${isAdmin ? "" : "mt-4 "}text-3xl font-bold tracking-tight`}>
            {heading}
          </h1>
          {!isAdmin ? (
            <p className="mt-4 text-base leading-7 text-black">{meta.description}</p>
          ) : null}

          <nav className="mt-10 space-y-4">
            <Link
              href={`/dashboard/${role}`}
              className={getNavItemClassName(`/dashboard/${role}`)}
            >
              Overview
            </Link>
            {role === "student" ? (
              <>
                <Link
                  href="/dashboard/student/proposals"
                  className={getNavItemClassName("/dashboard/student/proposals")}
                >
                  Submit Proposal
                </Link>
                <Link
                  href="/dashboard/student/progress-reports"
                  className={getNavItemClassName("/dashboard/student/progress-reports")}
                >
                  Progress Reports
                </Link>
                <Link
                  href="/dashboard/student/progress"
                  className={getNavItemClassName("/dashboard/student/progress")}
                >
                  Progress Dashboard
                </Link>
                <Link
                  href="/dashboard/student/theses/submit"
                  className={getNavItemClassName("/dashboard/student/theses/submit")}
                >
                  Submit Thesis
                </Link>
                <Link
                  href="/dashboard/student/theses/corrections"
                  className={getNavItemClassName("/dashboard/student/theses/corrections")}
                >
                  Thesis Corrections
                </Link>
              </>
            ) : null}
            {role === "supervisor" ? (
              <>
                <Link
                  href="/dashboard/supervisor/students"
                  className={getNavItemClassName("/dashboard/supervisor/students")}
                >
                  My Students
                </Link>
                <Link
                  href="/dashboard/supervisor/progress-reports/sign"
                  className={getNavItemClassName("/dashboard/supervisor/progress-reports/sign")}
                >
                  Sign Progress Reports
                </Link>
              </>
            ) : null}
            {role === "admin" ? (
              <>
                <Link
                  href="/dashboard/admin/users"
                  className={getNavItemClassName("/dashboard/admin/users")}
                >
                  Manage Users
                </Link>
                <Link
                  href="/dashboard/admin/proposals/evaluate"
                  className={getNavItemClassName("/dashboard/admin/proposals/evaluate")}
                >
                  Review & Approve Proposals
                </Link>
                <Link
                  href="/dashboard/admin/assignments/supervisors"
                  className={getNavItemClassName("/dashboard/admin/assignments/supervisors")}
                >
                  Supervisor Assignments
                </Link>
                <Link
                  href="/dashboard/admin/assignments/examiners"
                  className={getNavItemClassName("/dashboard/admin/assignments/examiners")}
                >
                  Examiner Assignments
                </Link>
                <Link
                  href="/dashboard/admin/vivas/schedule"
                  className={getNavItemClassName("/dashboard/admin/vivas/schedule")}
                >
                  Schedule Vivas
                </Link>
                <Link
                  href="/dashboard/admin/theses"
                  className={getNavItemClassName("/dashboard/admin/theses")}
                >
                  Finalize Theses
                </Link>
              </>
            ) : null}
            {role === "examiner" ? (
              <Link
                href="/dashboard/examiner/vivas"
                className={getNavItemClassName("/dashboard/examiner/vivas")}
              >
                Assigned Vivas
              </Link>
            ) : null}
          </nav>
        </aside>

        <div className="flex-1 overflow-y-auto rounded-[30px] bg-[#e0e0e0] p-6 shadow-[15px_15px_30px_#bebebe,-15px_-15px_30px_#ffffff] sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
