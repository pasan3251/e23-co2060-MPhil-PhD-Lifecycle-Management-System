"use client";

import Link from "next/link";
import { ProgramType, RegistrationStatus } from "@prisma/client";
import { useEffect, useState } from "react";

type SupervisorStudentListItem = {
  assignmentId: string;
  assignedAt: string | Date;
  isPrimary: boolean;
  student: {
    id: string;
    userId: string;
    displayName: string;
    email: string;
    programType: ProgramType;
    academicStatus: string;
  };
  currentRegistration: {
    id: string;
    status: RegistrationStatus;
    startDate: string | Date;
    expirationDate: string | Date;
  } | null;
  latestProposal: {
    id: string;
    title: string;
    status: string;
    updatedAt: string | Date;
  } | null;
};

const EMPTY_STUDENTS: SupervisorStudentListItem[] = [];

function formatDateLabel(value: string | Date | null | undefined) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getRegistrationLabel(
  registration: SupervisorStudentListItem["currentRegistration"],
) {
  return registration?.status ?? "UNKNOWN";
}

function getProposalLabel(proposal: SupervisorStudentListItem["latestProposal"]) {
  return proposal?.status ?? "NO_PROPOSAL";
}

export function SupervisorStudentsPanel({
  initialStudents = EMPTY_STUDENTS,
}: {
  initialStudents?: SupervisorStudentListItem[];
}) {
  const [students, setStudents] = useState(initialStudents);
  const [programFilter, setProgramFilter] = useState<"ALL" | "MPHIL" | "PHD">(
    "ALL",
  );
  const [registrationFilter, setRegistrationFilter] = useState<
    "ALL" | "ACTIVE" | "LAPSED"
  >("ALL");
  const [isLoading, setIsLoading] = useState(initialStudents.length === 0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialStudents.length > 0) {
      return;
    }

    let isMounted = true;

    void (async () => {
      setIsLoading(true);

      try {
        const response = await fetch("/api/supervisor/students", {
          cache: "no-store",
        });
        
        const responseText = await response.text();
        let payload: { error?: string; students?: SupervisorStudentListItem[] } = {};
        
        try {
          payload = JSON.parse(responseText);
        } catch (e) {
          console.error("Failed to parse supervisor students response:", responseText);
          throw new Error(`Invalid response from server (${response.status}). Please check console logs.`);
        }

        if (!response.ok || !payload.students) {
          throw new Error(payload.error ?? "Unable to load assigned students.");
        }

        if (isMounted) {
          setStudents(payload.students);
          setErrorMessage(null);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load assigned students.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [initialStudents.length]);

  const filteredStudents = students.filter((entry) => {
    const registrationLabel = getRegistrationLabel(entry.currentRegistration);

    if (programFilter !== "ALL" && entry.student.programType !== programFilter) {
      return false;
    }

    if (registrationFilter !== "ALL" && registrationLabel !== registrationFilter) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-10">
      <header className="pb-10 border-b-2 border-gray-300">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-4">
            <p className="text-base font-black uppercase tracking-[0.3em] text-black/40">
              Supervisor Overview
            </p>
            <h2 className="text-5xl font-black tracking-tighter text-black sm:text-6xl">
              Student Roster
            </h2>
            <p className="max-w-2xl text-xl font-medium leading-relaxed text-black/80">
              Review assigned postgraduate researchers, spot lapsed registrations, and
              jump directly to each student's profile and progress context.
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div className="flex flex-col space-y-3">
          <span className="ml-2 text-xs font-black uppercase tracking-widest text-gray-500">Program Type</span>
          <div className="rounded-2xl border border-gray-300 bg-[#e0e0e0] p-1 shadow-[inset_6px_6px_12px_#bebebe,inset_-6px_-6px_12px_#ffffff]">
            <select
              value={programFilter}
              onChange={(event) =>
                setProgramFilter(event.target.value as typeof programFilter)
              }
              className="w-full bg-transparent px-4 py-3 text-base font-bold text-black outline-none"
            >
              <option value="ALL">All programmes</option>
              <option value="MPHIL">MPhil</option>
              <option value="PHD">PhD</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col space-y-3">
          <span className="ml-2 text-xs font-black uppercase tracking-widest text-gray-500">Registration Status</span>
          <div className="rounded-2xl border border-gray-300 bg-[#e0e0e0] p-1 shadow-[inset_6px_6px_12px_#bebebe,inset_-6px_-6px_12px_#ffffff]">
            <select
              value={registrationFilter}
              onChange={(event) =>
                setRegistrationFilter(
                  event.target.value as typeof registrationFilter,
                )
              }
              className="w-full bg-transparent px-4 py-3 text-base font-bold text-black outline-none"
            >
              <option value="ALL">All registrations</option>
              <option value="ACTIVE">Active</option>
              <option value="LAPSED">Lapsed</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col justify-end">
          <div className="rounded-2xl border border-gray-300 bg-[#e0e0e0] px-6 py-4 shadow-[6px_6px_12px_#bebebe,-6px_-6px_12px_#ffffff]">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              Filtered results
            </p>
            <p className="mt-1 text-3xl font-black text-black">
              {filteredStudents.length}
            </p>
          </div>
        </div>
      </section>

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-600 shadow-[inset_4px_4px_8px_#fca5a5,inset_-4px_-4px_8px_#ffffff]">
          <p className="font-bold">{errorMessage}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex animate-pulse items-center justify-center rounded-[30px] border border-gray-300 bg-[#e0e0e0] py-20 shadow-[inset_10px_10px_20px_#bebebe,inset_-10px_-10px_20px_#ffffff]">
          <p className="text-xl font-bold text-gray-400">Loading assigned students...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[40px] border-2 border-dashed border-gray-300 bg-transparent py-24 text-center">
          <h3 className="text-3xl font-black text-black">No matches found</h3>
          <p className="mt-4 text-lg font-medium text-gray-500">Try adjusting your filters to find who you're looking for.</p>
        </div>
      ) : (
        <div className="rounded-[40px] bg-[#e0e0e0] p-1 shadow-[15px_15px_30px_#bebebe,-15px_-15px_30px_#ffffff]">
          <div className="overflow-x-auto p-4 sm:p-8">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left">
                  <th className="pb-6 pl-4 text-xs font-black uppercase tracking-[0.2em] text-gray-400">Researcher</th>
                  <th className="pb-6 text-xs font-black uppercase tracking-[0.2em] text-gray-400">Status & Proposal</th>
                  <th className="pb-6 pr-4 text-right text-xs font-black uppercase tracking-[0.2em] text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {filteredStudents.map((entry) => {
                  const registrationLabel = getRegistrationLabel(entry.currentRegistration);
                  const proposalLabel = getProposalLabel(entry.latestProposal);

                  return (
                    <tr key={entry.assignmentId} className="group hover:bg-black/5 transition-colors">
                      <td className="py-8 pl-4 pr-6">
                        <div className="flex flex-col">
                          <Link
                            href={`/dashboard/supervisor/students/${entry.student.id}`}
                            className="text-2xl font-black tracking-tight text-black transition-all hover:translate-x-1"
                          >
                            {entry.student.displayName}
                          </Link>
                          <span className="mt-1 text-sm font-bold text-gray-500">{entry.student.email}</span>
                          <div className="mt-3 flex items-center gap-3">
                            <span className="rounded-lg bg-gray-300 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-black">
                              {entry.student.programType}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                              {entry.isPrimary ? "Primary" : "Co-supervisor"} · {formatDateLabel(entry.assignedAt)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-8 pr-6">
                        <div className="flex flex-col space-y-4">
                          <div className="flex items-center gap-4">
                            <div className="h-2 w-2 rounded-full bg-black shadow-[0_0_8px_rgba(0,0,0,0.3)]" />
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Registration</span>
                              <span className="text-sm font-bold text-black">{registrationLabel} · Expires {formatDateLabel(entry.currentRegistration?.expirationDate)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className={`h-2 w-2 rounded-full ${proposalLabel === 'APPROVED' ? 'bg-black' : 'bg-gray-400'} shadow-[0_0_8px_rgba(0,0,0,0.1)]`} />
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Latest Proposal</span>
                              <span className="text-sm font-bold text-black truncate max-w-[200px]">
                                {entry.latestProposal ? entry.latestProposal.title : "No proposal submitted"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-8 pr-4 text-right">
                        <div className="flex flex-col items-end gap-3">
                          <Link
                            href={`/dashboard/supervisor/students/${entry.student.id}`}
                            className="rounded-xl border border-black bg-black px-5 py-2 text-xs font-black text-white shadow-[4px_4px_8px_#bebebe] transition-all hover:bg-gray-800"
                          >
                            Open Profile
                          </Link>
                          <Link
                            href={`/dashboard/supervisor/students/${entry.student.id}#progress-reports`}
                            className="rounded-xl border border-gray-400 bg-transparent px-5 py-2 text-xs font-black text-black transition-all hover:bg-black hover:text-white"
                          >
                            Reports
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
