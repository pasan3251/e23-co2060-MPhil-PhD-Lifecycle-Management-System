"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { proposalEvaluationSchema } from "@/lib/proposals/evaluation-schemas";
type ReviewerRole = "ADMINISTRATOR" | "SUPERVISOR";

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

export function ProposalEvaluationPanel({
  reviewerRole,
}: {
  reviewerRole: ReviewerRole;
}) {
  const [proposalId, setProposalId] = useState("");
  const [numericalScore, setNumericalScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [result, setResult] = useState<EvaluationPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [proposalsToReview, setProposalsToReview] = useState<any[]>([]);
  const [isListLoading, setIsListLoading] = useState(false);
  const isAdmin = reviewerRole === "ADMINISTRATOR";

  useEffect(() => {
    async function fetchProposals() {
      setIsListLoading(true);
      try {
        const endpoint =
          isAdmin
            ? "/api/admin/proposals"
            : "/api/supervisor/students";

        const response = await fetch(endpoint, {
          credentials: "include",
        });
        const payload = await response.json();

        if (response.ok) {
          if (isAdmin) {
            setProposalsToReview(payload.proposals || []);
          } else {
            // Normalize supervisor students to match proposal list format
            const normalized = (payload.students || [])
              .filter((item: any) => item.latestProposal)
              .map((item: any) => ({
                id: item.latestProposal.id,
                title: item.latestProposal.title,
                status: item.latestProposal.status,
                currentVersion: item.latestProposal.currentVersion,
                student: {
                  id: item.student.id,
                  displayName: item.student.displayName,
                },
              }));
            setProposalsToReview(normalized);
          }
        }
      } catch (error) {
        console.error("Failed to load proposals for review:", error);
      } finally {
        setIsListLoading(false);
      }
    }
    void fetchProposals();
  }, [isAdmin]);

  async function loadProposalById(id: string) {
    setProposalId(id);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/proposals/${id}/evaluations`, {
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

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedProposalId = proposalId.trim();

    if (!normalizedProposalId) {
      setErrorMessage("Enter a proposal ID before loading evaluations.");
      return;
    }

    await loadProposalById(normalizedProposalId);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const normalizedProposalId = proposalId.trim();

    if (!normalizedProposalId) {
      setErrorMessage("Enter a proposal ID before submitting an evaluation.");
      return;
    }

    if (!numericalScore.trim()) {
      setErrorMessage("Enter a score between 0 and 100 before submitting.");
      return;
    }

    const parsedEvaluation = proposalEvaluationSchema.safeParse({
      numericalScore: Number(numericalScore),
      feedback,
    });

    if (!parsedEvaluation.success) {
      setErrorMessage(
        parsedEvaluation.error.issues[0]?.message ??
          "Invalid proposal evaluation.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/proposals/${normalizedProposalId}/evaluations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(parsedEvaluation.data),
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

      const refreshResponse = await fetch(`/api/proposals/${normalizedProposalId}/evaluations`, {
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

  async function handleReject() {
    const normalizedProposalId = proposalId.trim();

    if (!normalizedProposalId) {
      setErrorMessage("Load a proposal before requesting revisions.");
      return;
    }
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!feedback.trim() || feedback.length < 50) {
      setErrorMessage(
        "Provide at least 50 characters of feedback explaining the rejection before requesting revisions.",
      );
      return;
    }

    setIsRejecting(true);

    try {
      const response = await fetch(`/api/proposals/${normalizedProposalId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          status: "REJECTED",
          feedback,
        }),
      });
      const payload = (await response.json()) as {
        proposal?: unknown;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to reject the proposal.");
      }

      setSuccessMessage(
        "Proposal rejected successfully. The student has been notified to submit a revised version.",
      );
      setNumericalScore("");
      setFeedback("");

      await loadProposalById(normalizedProposalId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to reject the proposal.",
      );
    } finally {
      setIsRejecting(false);
    }
  }

  async function handleApprove() {
    const normalizedProposalId = proposalId.trim();

    if (!normalizedProposalId) {
      setErrorMessage("Load a proposal before approving it.");
      return;
    }
    setErrorMessage(null);
    setSuccessMessage(null);

    setIsApproving(true);

    try {
      const response = await fetch(`/api/proposals/${normalizedProposalId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          status: "APPROVED",
          feedback: feedback || "Proposal approved after review.",
        }),
      });
      const payload = (await response.json()) as {
        proposal?: unknown;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to approve the proposal.");
      }

      setSuccessMessage(
        "Proposal approved successfully. The student research plan has been unlocked.",
      );
      setNumericalScore("");
      setFeedback("");

      await loadProposalById(normalizedProposalId);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to approve the proposal.",
      );
    } finally {
      setIsApproving(false);
    }
  }

  return (
    <main className="space-y-12">
      <header className="border-b-2 border-gray-200 pb-10">
        <p className="text-base font-black uppercase tracking-[0.3em] text-black/40">
          {isAdmin ? "Admin Review" : "Supervisor Evaluation"}
        </p>
        <h1 className="mt-3 text-5xl font-black tracking-tighter text-black sm:text-6xl">
          {isAdmin ? "Approve research proposals" : "Evaluate a proposal under review"}
        </h1>
        <p className="mt-3 max-w-3xl text-xl font-medium leading-relaxed text-black/80">
          {isAdmin
            ? "Review pending proposals from all students and provide final approval or request revisions."
            : "Load a proposal by ID, inspect existing evaluation history, and submit a single supervisor evaluation."}
        </p>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border-2 border-black bg-white px-6 py-4 text-base font-bold text-black shadow-[4px_4px_0px_black]">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border-2 border-black bg-white px-6 py-4 text-base font-bold text-black shadow-[4px_4px_0px_black]">
          {successMessage}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <section className="rounded-[24px] border border-gray-200 bg-transparent p-6">
            <h2 className="text-3xl font-black tracking-tight text-black">
              {isAdmin ? "All pending proposals" : "Assigned student proposals"}
            </h2>
            <p className="mt-2 text-lg font-medium leading-relaxed text-black/70">
              {isAdmin
                ? "Select a submission from the list below to review its history and status."
                : "Quickly select a proposal from your assigned students to start evaluating."}
            </p>

            <div className="mt-5 space-y-3">
              {isListLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-20 rounded-2xl bg-transparent" />
                  <div className="h-20 rounded-2xl bg-transparent" />
                </div>
              ) : proposalsToReview.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-base font-bold text-black/40">
                  {isAdmin
                    ? "No proposals are currently pending review."
                    : "No assigned students with active proposals found."}
                </div>
              ) : (
                proposalsToReview.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => loadProposalById(item.id)}
                    className={`group w-full rounded-2xl border p-4 text-left transition ${
                      proposalId === item.id
                        ? "border-2 border-black bg-white"
                        : "border border-gray-200 bg-transparent hover:bg-black/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-lg font-black tracking-tight text-black group-hover:text-black">
                          {item.student.displayName}
                        </p>
                        <p className="mt-1 truncate text-base font-medium text-black/70">
                          {item.title}
                        </p>
                      </div>
                      <span className="rounded-full border-2 border-black bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
                        V{item.currentVersion} • {item.status.replaceAll("_", " ")}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          <form
            onSubmit={handleLookup}
            className="rounded-[24px] border border-gray-200 bg-transparent p-6"
          >
            <h2 className="text-3xl font-black tracking-tight text-black">Load proposal</h2>
            <p className="mt-2 text-lg font-medium leading-relaxed text-black/70">
              Enter the proposal ID to load its evaluation history and status.
            </p>
            <label className="mt-5 block space-y-2 text-base text-black">
              <span className="ml-1 text-xs font-black uppercase tracking-widest text-black/40">Proposal ID</span>
              <input
                value={proposalId}
                onChange={(event) => setProposalId(event.target.value)}
                className="w-full rounded-[0.75em] border-2 border-black bg-white px-5 py-4 font-bold text-black outline-none focus:bg-gray-50"
                placeholder="proposal_abc123"
              />
            </label>
            <button
              type="submit"
              disabled={isLoading}
              className="group mt-5 inline-block cursor-pointer rounded-[0.75em] bg-black text-base font-bold disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="block -translate-y-[0.2em] rounded-[0.75em] border-2 border-black bg-black box-border px-[1.5em] py-[0.75em] text-white transition-transform duration-100 ease-out group-hover:-translate-y-[0.33em] group-active:translate-y-0">
                {isLoading ? "Loading..." : "Load evaluations"}
              </span>
            </button>
          </form>

          <form
            onSubmit={handleSubmit}
            className="rounded-[24px] border border-gray-200 bg-transparent p-6"
          >
            <h2 className="text-3xl font-black tracking-tight text-black">
              {isAdmin ? "Finalize decision" : "Submit evaluation"}
            </h2>
            <p className="mt-2 text-lg font-medium leading-relaxed text-black/70">
              The proposal must already be in the <span className="font-black text-black">UNDER_REVIEW</span> state
              {!isAdmin && ", and you must be assigned to the student"}.
            </p>

            <div className="mt-5 grid gap-4">
              {!isAdmin && (
                <label className="space-y-2 text-base text-black">
                  <span className="ml-1 text-xs font-black uppercase tracking-widest text-black/40">Score (0-100)</span>
                  <input
                    value={numericalScore}
                    onChange={(event) => setNumericalScore(event.target.value)}
                    type="number"
                    min={0}
                    max={100}
                    className="w-full rounded-[0.75em] border-2 border-black bg-white px-5 py-4 font-bold text-black outline-none focus:bg-gray-50"
                    placeholder="85"
                  />
                </label>
              )}

              <label className="space-y-2 text-base text-black">
                <span className="ml-1 text-xs font-black uppercase tracking-widest text-black/40">{isAdmin ? "Decision notes / Feedback" : "Feedback"}</span>
                <textarea
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                  className="min-h-44 w-full rounded-[0.75em] border-2 border-black bg-white px-5 py-4 font-bold text-black outline-none focus:bg-gray-50"
                  placeholder={isAdmin
                    ? "Explain your approval or rejection decision..." 
                    : "Provide at least 50 characters of evaluation feedback..."}
                />
              </label>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              {!isAdmin && (
                <button
                  type="submit"
                  disabled={isSubmitting || isRejecting || isApproving}
                  className="group inline-block cursor-pointer rounded-[0.75em] bg-black text-base font-bold disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span className="block -translate-y-[0.2em] rounded-[0.75em] border-2 border-black bg-black box-border px-[1.5em] py-[0.75em] text-white transition-transform duration-100 ease-out group-hover:-translate-y-[0.33em] group-active:translate-y-0">
                    {isSubmitting ? "Submitting..." : "Submit evaluation"}
                  </span>
                </button>
              )}
              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={isSubmitting || isRejecting || isApproving}
                    className="rounded-xl border-2 border-black px-4 py-2 text-xs font-black uppercase tracking-widest text-black transition hover:bg-red-600 hover:border-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-20"
                  >
                    {isRejecting ? "Rejecting..." : "Reject and request revisions"}
                  </button>
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={isSubmitting || isRejecting || isApproving}
                    className="group inline-block cursor-pointer rounded-[0.75em] bg-black text-base font-bold disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <span className="block -translate-y-[0.2em] rounded-[0.75em] border-2 border-black bg-black box-border px-[1.5em] py-[0.75em] text-white transition-transform duration-100 ease-out group-hover:-translate-y-[0.33em] group-active:translate-y-0">
                      {isApproving ? "Approving..." : "Approve Proposal"}
                    </span>
                  </button>
                </>
              )}
            </div>
          </form>
        </div>

        <section className="rounded-[24px] border border-gray-200 bg-transparent p-6">
          <h2 className="text-3xl font-black tracking-tight text-black">Evaluation history</h2>
          <p className="mt-2 text-lg font-medium leading-relaxed text-black/70">
            Existing evaluations and the current aggregate score for admin review.
          </p>

          {!result ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-gray-300 px-4 py-6 text-base font-bold text-black/40">
              Load a proposal to see its evaluation history.
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <div className="rounded-[24px] border border-gray-200 bg-transparent p-5">
                <p className="text-base font-black uppercase tracking-[0.18em] text-black/40">
                  Proposal
                </p>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-black">
                  {result.proposal.title}
                </h3>
                <p className="mt-2 text-base font-medium text-black/80">
                  Student: {result.proposal.student.displayName}
                </p>
                <p className="mt-1 text-base font-black uppercase tracking-[0.16em] text-black/40">
                  Status: {result.proposal.status.replaceAll("_", " ")}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] border border-gray-200 bg-transparent p-5">
                  <p className="text-base font-black uppercase tracking-[0.18em] text-black/40">
                    Aggregate Score
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-tight text-black">
                    {result.aggregate.averageScore ?? "N/A"}
                  </p>
                </div>
                <div className="rounded-[24px] border border-gray-200 bg-transparent p-5">
                  <p className="text-base font-black uppercase tracking-[0.18em] text-black/40">
                    Evaluation Count
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-tight text-black">
                    {result.aggregate.evaluationCount}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {result.evaluations.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-dashed border-gray-300 px-4 py-5 text-base font-bold text-black/40">
                    No evaluations submitted yet.
                  </div>
                ) : (
                  result.evaluations.map((evaluation) => (
                    <article
                      key={evaluation.id}
                      className="rounded-[24px] border border-gray-200 bg-transparent px-5 py-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-black tracking-tight text-black">
                            {evaluation.evaluator.displayName}
                          </p>
                          <p className="mt-1 text-base font-black uppercase tracking-[0.16em] text-black/40">
                            Submitted {formatDateLabel(evaluation.submissionDate)}
                          </p>
                        </div>
                        <span className="rounded-full border-2 border-black bg-white px-3 py-1 text-base font-black text-black">
                          {evaluation.numericalScore}/100
                        </span>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-base font-medium leading-6 text-black/80">
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
