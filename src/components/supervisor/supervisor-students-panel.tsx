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
      <header className="border-b-2 border-gray-200 pb-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-4">
            <p className="text-base font-black uppercase tracking-[0.3em] text-black/40">
              Roster
            </p>
            <h2 className="text-5xl font-black tracking-tighter text-black sm:text-6xl">
              Student Roster
            </h2>
            <p className="max-w-2xl text-xl font-medium leading-relaxed text-black/80">
              Review assigned students, registrations, and latest proposals.
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div className="flex flex-col space-y-3">
          <span className="ml-1 text-xs font-black uppercase tracking-widest text-black/40">Program Type</span>
          <select
            value={programFilter}
            onChange={(event) =>
              setProgramFilter(event.target.value as typeof programFilter)
            }
            className="w-full rounded-[24px] border border-gray-300 bg-white px-5 py-4 text-base font-bold text-black outline-none transition hover:bg-black hover:text-white"
          >
            <option value="ALL">All programmes</option>
            <option value="MPHIL">MPhil</option>
            <option value="PHD">PhD</option>
          </select>
        </div>

        <div className="flex flex-col space-y-3">
          <span className="ml-1 text-xs font-black uppercase tracking-widest text-black/40">Registration Status</span>
          <select
            value={registrationFilter}
            onChange={(event) =>
              setRegistrationFilter(
                event.target.value as typeof registrationFilter,
              )
            }
            className="w-full rounded-[24px] border border-gray-300 bg-white px-5 py-4 text-base font-bold text-black outline-none transition hover:bg-black hover:text-white"
          >
            <option value="ALL">All registrations</option>
            <option value="ACTIVE">Active</option>
            <option value="LAPSED">Lapsed</option>
          </select>
        </div>

        <div className="flex flex-col justify-end">
          <div className="group rounded-[24px] border border-gray-300 bg-white px-6 py-4 transition-all hover:bg-black">
            <p className="text-[14px] font-black uppercase tracking-[0.2em] text-black/40 transition-colors group-hover:text-white/70">
              Filtered results
            </p>
            <p className="mt-2 text-3xl font-black tracking-tight text-black transition-colors group-hover:text-white">
              {filteredStudents.length}
            </p>
          </div>
        </div>
      </section>

      {errorMessage && (
        <div className="rounded-2xl border-2 border-black bg-white px-6 py-4 text-base font-bold text-black shadow-[4px_4px_0px_black]">
          <p>{errorMessage}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex animate-pulse items-center justify-center rounded-[24px] border border-gray-300 bg-white py-20">
          <p className="text-xl font-bold text-black/40">Loading assigned students...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-gray-300 bg-white py-24 text-center">
          <h3 className="text-3xl font-black text-black">No matches found</h3>
          <p className="mt-4 text-lg font-medium text-black/70">Adjust your filters and try again.</p>
        </div>
      ) : (
        <div className="rounded-[24px] border border-gray-300 bg-white p-4 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left">
                  <th className="pb-6 pl-4 text-xs font-black uppercase tracking-[0.2em] text-black/40">Researcher</th>
                  <th className="pb-6 text-xs font-black uppercase tracking-[0.2em] text-black/40">Status & Proposal</th>
                  <th className="pb-6 pr-4 text-right text-xs font-black uppercase tracking-[0.2em] text-black/40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {filteredStudents.map((entry) => {
                  const registrationLabel = getRegistrationLabel(entry.currentRegistration);
                  const proposalLabel = getProposalLabel(entry.latestProposal);

                  return (
                    <tr key={entry.assignmentId}>
                      <td className="py-8 pl-4 pr-6">
                        <div className="flex flex-col">
                          <Link
                            href={`/dashboard/supervisor/students/${entry.student.id}`}
                            className="text-2xl font-black tracking-tight text-black"
                          >
                            {entry.student.displayName}
                          </Link>
                          <span className="mt-1 text-sm font-bold text-black/60">{entry.student.email}</span>
                          <div className="mt-3 flex items-center gap-3">
                            <span className="rounded-full border-2 border-black bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wider text-black">
                              {entry.student.programType}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-black/40">
                              {entry.isPrimary ? "Primary" : "Co-supervisor"} · {formatDateLabel(entry.assignedAt)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-8 pr-6">
                        <div className="flex flex-col space-y-4">
                          <div className="flex items-center gap-4">
                            <div className="h-2 w-2 rounded-full bg-black" />
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black uppercase tracking-widest text-black/40">Registration</span>
                              <span className="text-sm font-bold text-black">{registrationLabel} · Expires {formatDateLabel(entry.currentRegistration?.expirationDate)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className={`h-2 w-2 rounded-full ${proposalLabel === 'APPROVED' ? 'bg-black' : 'bg-gray-400'}`} />
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black uppercase tracking-widest text-black/40">Latest Proposal</span>
                              <span className="max-w-[200px] truncate text-sm font-bold text-black">
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
                            className="rounded-xl border-2 border-black bg-white px-5 py-2 text-xs font-black text-black transition-all duration-150 hover:-translate-y-0.5 hover:bg-black hover:text-white"
                          >
                            Open Profile
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
