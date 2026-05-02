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
        <div className="rounded-[30px] border border-gray-300 bg-[#e0e0e0] px-8 py-6 shadow-[8px_8px_16px_#bebebe,-8px_-8px_16px_#ffffff]">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            Programme
          </p>
          <p className="mt-2 text-2xl font-black text-black">
            {student.programType}
          </p>
        </div>
        <div className="rounded-[30px] border border-gray-300 bg-[#e0e0e0] px-8 py-6 shadow-[8px_8px_16px_#bebebe,-8px_-8px_16px_#ffffff]">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            Academic Status
          </p>
          <p className="mt-2 text-2xl font-black text-black">
            {student.academicStatus}
          </p>
        </div>
        <div className="rounded-[30px] border border-gray-300 bg-[#e0e0e0] px-8 py-6 shadow-[8px_8px_16px_#bebebe,-8px_-8px_16px_#ffffff]">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            Enrolled Since
          </p>
          <p className="mt-2 text-2xl font-black text-black">
            {formatDateLabel(student.enrollmentDate)}
          </p>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section
          id="research-proposals"
          className="rounded-[40px] bg-[#e0e0e0] p-1 shadow-[15px_15px_30px_#bebebe,-15px_-15px_30px_#ffffff]"
        >
          <div className="p-8 sm:p-10">
            <h3 className="text-3xl font-black tracking-tight text-black">
              Research Proposals
            </h3>
            <p className="mt-4 text-lg font-medium leading-relaxed text-gray-600">
              Access the full history of research proposal submissions, supervisor evaluations, 
              and final approval records for this student.
            </p>
            <div className="mt-8">
              <Link
                href={`#`}
                className="rounded-2xl bg-black px-6 py-3 text-sm font-black text-white shadow-[4px_4px_8px_#bebebe] transition-all hover:bg-gray-800"
              >
                View Proposal History
              </Link>
            </div>
          </div>
        </section>

        <section
          id="progress-reports"
          className="rounded-[40px] bg-[#e0e0e0] p-1 shadow-[15px_15px_30px_#bebebe,-15px_-15px_30px_#ffffff]"
        >
          <div className="p-8 sm:p-10">
            <h3 className="text-3xl font-black tracking-tight text-black">
              Progress Reports
            </h3>
            <p className="mt-4 text-lg font-medium leading-relaxed text-gray-600">
              Monitor periodic narrative reports, check sign-off status, and review 
              feedback history from the assigned panels.
            </p>
            <div className="mt-8">
              <Link
                href={`#`}
                className="rounded-2xl border border-black bg-transparent px-6 py-3 text-sm font-black text-black transition-all hover:bg-black hover:text-white"
              >
                Open Progress Logs
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
