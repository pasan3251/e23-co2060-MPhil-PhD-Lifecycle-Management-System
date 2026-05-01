"use client";

import { useState } from "react";
import type { FormEvent } from "react";

type EvaluationPayload = {
  proposal: {
    id: string;
    title: string;
    status: "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
    student: {
      id: string;
      displayName: string;
      email: string;
    };
  };
  evaluations: Array<{
    id: string;
    numericalScore: number;
    feedback: string;
    submissionDate: string;
    evaluator: {
      supervisorId: string;
      userId: string;
      displayName: string;
      email: string;
    };
  }>;
  aggregate: {
    evaluationCount: number;
    averageScore: number | null;
  };
  error?: string;
};

function formatDateLabel(value: string) {
  return new Date(value).toLocaleString();
}

export function ProposalEvaluationPanel() {
  const [proposalId, setProposalId] = useState("");
  const [numericalScore, setNumericalScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [result, setResult] = useState<EvaluationPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/proposals/${proposalId}/evaluations`, {
        credentials: "include",
      });
      
      const responseText = await response.text();
      let payload: EvaluationPayload;

      try {
        payload = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse proposal evaluations response:", responseText);
        throw new Error(`Invalid response from server (${response.status}). Please check console logs.`);
      }

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load proposal evaluations.");
      }

      setResult(payload);
    } catch (error) {
      setResult(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load proposal evaluations.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!proposalId.trim()) {
      setErrorMessage("Enter a proposal ID before submitting an evaluation.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/proposals/${proposalId}/evaluations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          numericalScore: Number(numericalScore),
          feedback,
        }),
      });
      const payload = (await response.json()) as {
        evaluation?: unknown;
        aggregate?: EvaluationPayload["aggregate"];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to submit the proposal evaluation.");
      }

      setSuccessMessage("Proposal evaluation submitted successfully.");
      setNumericalScore("");
      setFeedback("");

      const refreshResponse = await fetch(`/api/proposals/${proposalId}/evaluations`, {
        credentials: "include",
      });
      const refreshPayload = (await refreshResponse.json()) as EvaluationPayload;

      if (refreshResponse.ok) {
        setResult(refreshPayload);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit the proposal evaluation.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="space-y-6">
      <section className="rounded-[2rem] border border-slate-800 bg-slate-950/70 px-5 py-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)] sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
          Supervisor Evaluation
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
          Evaluate a proposal under review
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Load a proposal by ID, inspect existing evaluation history, and submit a
          single supervisor evaluation with a 0-100 score and detailed feedback.
        </p>
      </section>

      {errorMessage ? (
        <div className="rounded-[1.5rem] border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-[1.5rem] border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {successMessage}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <form
            onSubmit={handleLookup}
            className="rounded-[2rem] border border-slate-800 bg-slate-950/70 p-5 shadow-[0_20px_60px_rgba(2,6,23,0.35)] sm:p-6"
          >
            <h2 className="text-xl font-semibold text-white">Load proposal</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Enter the proposal ID to load its evaluation history and status.
            </p>
            <label className="mt-5 block space-y-2 text-sm text-slate-200">
              <span>Proposal ID</span>
              <input
                value={proposalId}
                onChange={(event) => setProposalId(event.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-sky-400"
                placeholder="proposal_abc123"
              />
            </label>
            <button
              type="submit"
              disabled={isLoading}
              className="mt-5 rounded-2xl border border-sky-400/40 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-100 transition hover:border-sky-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Loading..." : "Load evaluations"}
            </button>
          </form>

          <form
            onSubmit={handleSubmit}
            className="rounded-[2rem] border border-slate-800 bg-slate-950/70 p-5 shadow-[0_20px_60px_rgba(2,6,23,0.35)] sm:p-6"
          >
            <h2 className="text-xl font-semibold text-white">Submit evaluation</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              The proposal must already be in the <span className="font-semibold text-slate-200">UNDER_REVIEW</span> state, and you must be assigned to the student.
            </p>

            <div className="mt-5 grid gap-4">
              <label className="space-y-2 text-sm text-slate-200">
                <span>Score (0-100)</span>
                <input
                  value={numericalScore}
                  onChange={(event) => setNumericalScore(event.target.value)}
                  type="number"
                  min={0}
                  max={100}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-sky-400"
                  placeholder="85"
                />
              </label>

              <label className="space-y-2 text-sm text-slate-200">
                <span>Feedback</span>
                <textarea
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                  className="min-h-44 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-sky-400"
                  placeholder="Provide at least 50 characters of evaluation feedback, covering strengths, gaps, and next improvements."
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-5 rounded-2xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Submitting..." : "Submit evaluation"}
            </button>
          </form>
        </div>

        <section className="rounded-[2rem] border border-slate-800 bg-slate-950/70 p-5 shadow-[0_20px_60px_rgba(2,6,23,0.35)] sm:p-6">
          <h2 className="text-xl font-semibold text-white">Evaluation history</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Existing evaluations and the current aggregate score for admin review.
          </p>

          {!result ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-700 px-4 py-6 text-sm text-slate-400">
              Load a proposal to see its evaluation history.
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Proposal
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white">
                  {result.proposal.title}
                </h3>
                <p className="mt-2 text-sm text-slate-300">
                  Student: {result.proposal.student.displayName}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                  Status: {result.proposal.status.replaceAll("_", " ")}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900/80 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Aggregate Score
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-white">
                    {result.aggregate.averageScore ?? "N/A"}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900/80 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Evaluation Count
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-white">
                    {result.aggregate.evaluationCount}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {result.evaluations.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-700 px-4 py-5 text-sm text-slate-400">
                    No evaluations submitted yet.
                  </div>
                ) : (
                  result.evaluations.map((evaluation) => (
                    <article
                      key={evaluation.id}
                      className="rounded-[1.5rem] border border-slate-800 bg-slate-900/80 px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-white">
                            {evaluation.evaluator.displayName}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                            Submitted {formatDateLabel(evaluation.submissionDate)}
                          </p>
                        </div>
                        <span className="rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-100">
                          {evaluation.numericalScore}/100
                        </span>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                        {evaluation.feedback}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
