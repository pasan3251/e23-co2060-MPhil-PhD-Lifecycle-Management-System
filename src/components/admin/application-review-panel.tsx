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
  const [showConfirmModal, setShowConfirmModal] = useState<{
    show: boolean;
    type: "ADMITTED" | "REJECTED" | null;
  }>({ show: false, type: null });

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

  const handleUpdateStatus = async () => {
    const status = showConfirmModal.type;
    if (!status) return;

    setIsUpdating(true);
    setShowConfirmModal({ show: false, type: null });

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
        <div className="h-8 w-1/3 rounded bg-transparent"></div>
        <div className="h-64 w-full rounded-2xl bg-transparent"></div>
      </div>
    );
  }

  if (error || !application) {
    return <div className="rounded-xl border border-gray-300 bg-transparent p-6 text-black">{error || "Not found"}</div>;
  }

  return (
    <div className="relative space-y-8 pb-10">
      {/* Custom Neumorphic Modal */}
      {showConfirmModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md">
          <div className="w-full max-w-md scale-100 rounded-[40px] border border-gray-300 bg-[#e0e0e0] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.2)] transition-all">
            <h3 className="text-2xl font-bold text-black">
              {showConfirmModal.type === "ADMITTED" ? "Confirm Admission" : "Confirm Rejection"}
            </h3>
            <p className="mt-4 text-lg text-gray-600">
              Are you sure you want to {showConfirmModal.type === "ADMITTED" ? "admit" : "reject"} <strong>{application.applicantName}</strong>?
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-end">
              <button
                onClick={() => setShowConfirmModal({ show: false, type: null })}
                className="rounded-2xl border border-gray-300 bg-[#e0e0e0] px-6 py-3 font-bold text-black shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff] transition-all hover:bg-gray-300 active:shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff]"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                className={`rounded-2xl px-6 py-3 font-bold text-white shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff] transition-all active:shadow-none ${showConfirmModal.type === "ADMITTED" ? "bg-black hover:bg-gray-800" : "bg-red-600 hover:bg-red-700"
                  }`}
              >
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-black">Review Application</h1>
        <Link
          href="/dashboard/admin/applications"
          className="rounded-xl border border-gray-300 bg-[#e0e0e0] px-4 py-2 text-sm font-bold text-black shadow-[4px_4px_8px_#bebebe,-4px_-4px_8px_#ffffff] transition-all hover:bg-black hover:text-white"
        >
          &larr; Back to List
        </Link>
      </div>

      <div className="rounded-[30px] bg-[#e0e0e0] p-1 shadow-[15px_15px_30px_#bebebe,-15px_-15px_30px_#ffffff]">
        <div className="p-6 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold text-black">{application.applicantName}</h2>
              <p className="mt-2 text-lg font-medium text-gray-600">
                {application.applicantEmail} • {application.applicantPhone || "No phone provided"}
              </p>
            </div>
            <div className="inline-flex w-fit rounded-xl border border-gray-300 bg-[#e0e0e0] px-4 py-2 text-sm font-bold uppercase tracking-wider text-black shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff]">
              {application.programType}
            </div>
          </div>

          <div className="mt-12 grid gap-10 lg:grid-cols-2">
            <div className="space-y-8">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Research Area</h3>
                <div className="mt-3 rounded-2xl border border-gray-300 bg-[#e0e0e0] p-4 text-lg font-semibold text-black shadow-[inset_6px_6px_12px_#bebebe,inset_-6px_-6px_12px_#ffffff]">
                  {application.researchArea || "Not specified"}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Statement of Purpose</h3>
                <div className="mt-3 rounded-2xl border border-gray-300 bg-[#e0e0e0] p-6 text-base leading-relaxed text-black shadow-[inset_6px_6px_12px_#bebebe,inset_-6px_-6px_12px_#ffffff]">
                  {application.statementOfPurpose || "No statement provided."}
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-4">Supporting Documents</h3>
              <div className="flex-1 rounded-[30px] border border-gray-300 bg-[#e0e0e0] p-6 shadow-[inset_6px_6px_12px_#bebebe,inset_-6px_-6px_12px_#ffffff]">
                {application.documents.length === 0 ? (
                  <p className="text-gray-500 italic">No documents attached.</p>
                ) : (
                  <ul className="space-y-6">
                    {application.documents.map((doc) => (
                      <li key={doc.id} className="group">
                        <div className="flex items-start space-x-4">
                          <div className="rounded-lg bg-gray-300 p-2 text-black shadow-[2px_2px_4px_#bebebe,-2px_-2px_4px_#ffffff] transition-all group-hover:shadow-[inset_2px_2px_4px_#bebebe,inset_-2px_-2px_4px_#ffffff]">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                          </div>
                          <div className="flex flex-col space-y-2 overflow-hidden">
                            <span className="truncate font-bold text-black" title={doc.fileName}>
                              {doc.fileName}
                            </span>
                            <button
                              onClick={() => handleDownload(doc.id, doc.fileName)}
                              className="w-fit rounded-xl border border-gray-400 bg-transparent px-4 py-1.5 text-xs font-bold text-black transition-all hover:bg-black hover:text-white"
                            >
                              Download File
                            </button>
                          </div>
                        </div>
                        <div className="mt-6 h-px w-full bg-gray-300 shadow-[0_1px_0_#ffffff]"></div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="mt-16 flex flex-col-reverse justify-end gap-6 border-t border-gray-300 pt-10 sm:flex-row">
            <button
              onClick={() => setShowConfirmModal({ show: true, type: "REJECTED" })}
              disabled={isUpdating}
              className="group relative flex items-center justify-center rounded-2xl border border-red-300 bg-[#e0e0e0] px-8 py-4 text-base font-bold text-red-600 shadow-[6px_6px_12px_#bebebe,-6px_-6px_12px_#ffffff] transition-all hover:bg-red-600 hover:text-white active:shadow-[inset_4px_4px_8px_#8b0000,inset_-4px_-4px_8px_#ff0000]"
            >
              Reject Application
            </button>
            <button
              onClick={() => setShowConfirmModal({ show: true, type: "ADMITTED" })}
              disabled={isUpdating}
              className="group relative flex items-center justify-center rounded-2xl border border-black bg-black px-8 py-4 text-base font-bold text-white shadow-[6px_6px_12px_#bebebe,-6px_-6px_12px_#ffffff] transition-all hover:bg-gray-800 active:shadow-none"
            >
              {isUpdating ? "Processing..." : "Admit Student"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
