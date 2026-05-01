"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import Link from "next/link";

type ApplicationDetails = {
  id: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  researchArea: string;
  statementOfPurpose: string;
  programType: string;
  status: string;
  createdAt: string;
  documents: {
    id: string;
    fileName: string;
    mimeType: string;
  }[];
};

export function ApplicationReviewPanel({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    async function fetchDetails() {
      try {
        const res = await fetch(`/api/applications/${applicationId}`);
        if (!res.ok) throw new Error("Failed to load application details");
        const data = await res.json();
        setApplication(data.application);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred.");
      } finally {
        setIsLoading(false);
      }
    }

    void fetchDetails();
  }, [applicationId]);

  const handleDownload = async (docId: string, fileName: string) => {
    try {
      const res = await fetch(`/api/applications/${applicationId}/documents/${docId}/download`);
      if (!res.ok) throw new Error("Failed to get download link");
      const data = await res.json();
      
      // Open the signed URL in a new tab
      window.open(data.downloadUrl, "_blank");
    } catch (err) {
      alert("Failed to download document. Please try again.");
    }
  };

  const handleUpdateStatus = async (status: "ADMITTED" | "REJECTED") => {
    if (!confirm(`Are you sure you want to ${status.toLowerCase()} this applicant?`)) return;
    
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }
      
      router.push("/dashboard/admin/applications");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred updating the status.");
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex animate-pulse flex-col space-y-6">
        <div className="h-8 w-1/3 rounded bg-gray-100/50"></div>
        <div className="h-64 w-full rounded-2xl bg-gray-100/50"></div>
      </div>
    );
  }

  if (error || !application) {
    return <div className="rounded-xl border border-gray-300 bg-gray-100 p-6 text-black">{error || "Not found"}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Review Application</h1>
        <Link href="/dashboard/admin/applications" className="text-sm text-black hover:text-white">
          &larr; Back to List
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/50 shadow-xl">
        <div className="border-b border-gray-200 p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">{application.applicantName}</h2>
              <p className="mt-1 text-black">{application.applicantEmail} • {application.applicantPhone || "No phone provided"}</p>
            </div>
            <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-black">
              {application.programType}
            </span>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wider text-black0">Research Area</h3>
            <p className="mt-2 text-lg text-black">{application.researchArea || "Not specified"}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium uppercase tracking-wider text-black0">Statement of Purpose</h3>
            <div className="mt-2 rounded-xl bg-white/50 p-4 text-black">
              {application.statementOfPurpose || "No statement provided."}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium uppercase tracking-wider text-black0 mb-4">Supporting Documents</h3>
            {application.documents.length === 0 ? (
              <p className="text-black">No documents attached.</p>
            ) : (
              <ul className="space-y-3">
                {application.documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white/50 p-4">
                    <div className="flex items-center space-x-3">
                      <svg className="h-6 w-6 text-black" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      <span className="font-medium text-black">{doc.fileName}</span>
                    </div>
                    <button
                      onClick={() => handleDownload(doc.id, doc.fileName)}
                      className="text-sm font-medium text-black hover:text-black"
                    >
                      Download
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 bg-white/50 p-6 sm:p-8">
          <div className="flex flex-col-reverse justify-end gap-4 sm:flex-row">
            <button
              onClick={() => handleUpdateStatus("REJECTED")}
              disabled={isUpdating}
              className="rounded-lg border border-gray-300 bg-gray-100 px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-gray-100 disabled:opacity-50"
            >
              Reject Application
            </button>
            <button
              onClick={() => handleUpdateStatus("ADMITTED")}
              disabled={isUpdating}
              className="rounded-lg bg-black px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black disabled:opacity-50"
            >
              {isUpdating ? "Processing..." : "Admit Student"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
