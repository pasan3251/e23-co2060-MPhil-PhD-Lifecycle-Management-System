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
      <div className="rounded-[2rem] border border-gray-200 bg-transparent p-6 text-base text-black">
        Loading student profile...
      </div>
    );
  }

  if (errorMessage || !student) {
    return (
      <div className="rounded-[2rem] border border-gray-300 bg-transparent px-5 py-4 text-base text-black">
        {errorMessage ?? "Student profile could not be loaded."}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="pb-10 border-b-2 border-gray-300">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-4">
            <Link
              href="/dashboard/supervisor/students"
              className="group inline-flex items-center text-xs font-black uppercase tracking-widest text-black/40 transition-colors hover:text-black"
            >
              <span className="mr-2 transition-transform group-hover:-translate-x-1">&larr;</span> Back to Roster
            </Link>
            <h1 className="text-5xl font-black tracking-tighter text-black sm:text-6xl">
              {student.user.displayName}
            </h1>
            <p className="max-w-2xl text-xl font-medium leading-relaxed text-black/80">
              {student.user.email} · {student.programType} Researcher
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-6 sm:grid-cols-3">
        <div className="group rounded-[24px] border border-gray-300 bg-white px-6 py-6 transition-all hover:bg-black">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 transition-colors group-hover:text-white/70">
            Programme
          </p>
          <p className="mt-3 text-2xl font-black tracking-tight text-black transition-colors group-hover:text-white">
            {student.programType}
          </p>
        </div>
        <div className="group rounded-[24px] border border-gray-300 bg-white px-6 py-6 transition-all hover:bg-black">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 transition-colors group-hover:text-white/70">
            Academic Status
          </p>
          <p className="mt-3 text-2xl font-black tracking-tight text-black transition-colors group-hover:text-white">
            {student.academicStatus}
          </p>
        </div>
        <div className="group rounded-[24px] border border-gray-300 bg-white px-6 py-6 transition-all hover:bg-black">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 transition-colors group-hover:text-white/70">
            Enrolled Since
          </p>
          <p className="mt-3 text-2xl font-black tracking-tight text-black transition-colors group-hover:text-white">
            {formatDateLabel(student.enrollmentDate)}
          </p>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section
          id="research-proposals"
          className="group rounded-[24px] border border-gray-300 bg-white p-8 transition-all hover:bg-black"
        >
          <h3 className="text-3xl font-black tracking-tight text-black transition-colors group-hover:text-white">
            Research Proposals
          </h3>
          <p className="mt-4 text-lg font-medium leading-relaxed text-black/70 transition-colors group-hover:text-white/80">
            Review proposal submissions, evaluations, and approval history.
          </p>
          <div className="mt-8">
            <Link
              href={`#`}
              className="rounded-xl border-2 border-black bg-white px-6 py-3 text-sm font-black text-black transition-all hover:bg-black hover:text-white"
            >
              View Proposal History
            </Link>
          </div>
        </section>

        <section
          id="progress-reports"
          className="group rounded-[24px] border border-gray-300 bg-white p-8 transition-all hover:bg-black"
        >
          <h3 className="text-3xl font-black tracking-tight text-black transition-colors group-hover:text-white">
            Progress Reports
          </h3>
          <p className="mt-4 text-lg font-medium leading-relaxed text-black/70 transition-colors group-hover:text-white/80">
            Review submitted reports, sign-off status, and panel feedback.
          </p>
          <div className="mt-8">
            <Link
              href={`#`}
              className="rounded-xl border-2 border-black bg-white px-6 py-3 text-sm font-black text-black transition-all hover:bg-black hover:text-white"
            >
              Open Progress Reports
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
