"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { progressReportSubmissionSchema } from "@/lib/progress-reports/schemas";

export function ProgressReportSubmissionForm() {
  const router = useRouter();
  const [periodLabel, setPeriodLabel] = useState("");
  const [narrative, setNarrative] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);

    const parsed = progressReportSubmissionSchema.safeParse({
      periodLabel,
      narrative,
    });

    if (!parsed.success) {
      setErrorMessage(
        parsed.error.issues[0]?.message ?? "Invalid progress report details.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/student/progress-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          periodLabel: parsed.data.periodLabel,
          narrative: parsed.data.narrative,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setErrorMessage(payload.error ?? "Failed to submit progress report.");
        return;
      }

      router.push("/dashboard/student/progress-reports");
      router.refresh();
    } catch (error) {
      setErrorMessage("A network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-[24px] border border-gray-300 bg-white p-6">
      {errorMessage && (
        <div className="rounded-2xl border-2 border-black bg-white px-4 py-3 text-base font-bold text-black">
          {errorMessage}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="periodLabel" className="ml-1 text-xs font-black uppercase tracking-widest text-black/40">
          Reporting Period (e.g., Jan-Jun 2024)
        </label>
        <input
          id="periodLabel"
          type="text"
          required
          value={periodLabel}
          onChange={(e) => setPeriodLabel(e.target.value)}
          placeholder="Enter the time period this report covers"
          className="w-full rounded-[0.75em] border-2 border-black bg-white px-5 py-4 font-bold text-black outline-none transition focus:bg-gray-50"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="narrative" className="ml-1 text-xs font-black uppercase tracking-widest text-black/40">
          Narrative Report
        </label>
        <textarea
          id="narrative"
          required
          rows={10}
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          placeholder="Provide a detailed update on your research progress, challenges, and next steps (min 100 characters)..."
          className="w-full rounded-[0.75em] border-2 border-black bg-white px-5 py-4 font-bold text-black outline-none transition focus:bg-gray-50"
        />
        <p className="text-right text-base font-medium text-black/40">
          {narrative.length} characters (min 100)
        </p>
      </div>

      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border-2 border-black px-6 py-3 text-xs font-black uppercase tracking-widest text-black transition hover:bg-black hover:text-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={
            isSubmitting ||
            !progressReportSubmissionSchema.safeParse({
              periodLabel,
              narrative,
            }).success
          }
          className="group inline-block cursor-pointer rounded-[0.75em] bg-black text-base font-bold disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="block -translate-y-[0.2em] rounded-[0.75em] border-2 border-black bg-black px-8 py-3 text-white transition-transform duration-100 ease-out group-hover:-translate-y-[0.33em] group-active:translate-y-0">
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </span>
        </button>
      </div>
    </form>
  );
}
