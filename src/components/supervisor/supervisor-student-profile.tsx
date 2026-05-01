"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type StudentProfilePayload = {
  id: string;
  userId: string;
  programType: string;
  academicStatus: string;
  enrollmentDate: string | Date;
  user: {
    id: string;
    email: string;
    displayName: string;
  };
  supervisors: Array<{
    userId: string;
    displayName: string;
    email: string;
  }>;
};

function formatDateLabel(value: string | Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function SupervisorStudentProfile({
  studentId,
}: {
  studentId: string;
}) {
  const [student, setStudent] = useState<StudentProfilePayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      setIsLoading(true);

      try {
        const response = await fetch(`/api/students/${studentId}`, {
          cache: "no-store",
        });
        
        const responseText = await response.text();
        let payload: { error?: string; student?: StudentProfilePayload } = {};

        try {
          payload = JSON.parse(responseText);
        } catch (e) {
          console.error("Failed to parse student profile response:", responseText);
          throw new Error(`Invalid response from server (${response.status}). Please check console logs.`);
        }

        if (!response.ok || !payload.student) {
          throw new Error(payload.error ?? "Unable to load the student profile.");
        }

        if (isMounted) {
          setStudent(payload.student);
          setErrorMessage(null);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load the student profile.",
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
  }, [studentId]);

  if (isLoading) {
    return (
      <div className="rounded-[2rem] border border-slate-800 bg-slate-950/70 p-6 text-sm text-slate-300">
        Loading student profile...
      </div>
    );
  }

  if (errorMessage || !student) {
    return (
      <div className="rounded-[2rem] border border-rose-400/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
        {errorMessage ?? "Student profile could not be loaded."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-800 bg-slate-950/75 p-5 shadow-[0_24px_80px_rgba(2,6,23,0.45)] sm:p-7">
        <Link
          href="/dashboard/supervisor/students"
          className="text-sm font-medium text-sky-300 transition hover:text-sky-200"
        >
          Back to My Students
        </Link>
        <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
          {student.user.displayName}
        </h2>
        <p className="mt-2 text-sm text-slate-300">{student.user.email}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Programme
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {student.programType}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Academic status
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {student.academicStatus}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Enrolled
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {formatDateLabel(student.enrollmentDate)}
            </p>
          </div>
        </div>
      </section>

      <section
        id="research-proposals"
        className="rounded-[2rem] border border-slate-800 bg-slate-950/70 p-5 sm:p-7"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
          Research Proposals
        </p>
        <h3 className="mt-3 text-2xl font-semibold text-white">
          Proposal history access
        </h3>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Use this student profile as your anchor point before opening proposal
          workflow actions and historical review pages tied to the assigned student.
        </p>
      </section>

      <section
        id="progress-reports"
        className="rounded-[2rem] border border-slate-800 bg-slate-950/70 p-5 sm:p-7"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
          Progress Reports
        </p>
        <h3 className="mt-3 text-2xl font-semibold text-white">
          Progress reporting context
        </h3>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          This workspace keeps the assigned student context visible while you review
          their academic progress and coordinate future reporting follow-up.
        </p>
      </section>
    </div>
  );
}
