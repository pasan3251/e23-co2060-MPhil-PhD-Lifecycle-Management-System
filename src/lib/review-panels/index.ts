import type { AuthenticatedUserContext } from "@/types/auth";

export class ReviewPanelError extends Error {
  status: 400 | 403 | 404 | 409 | 410 | 422 | 500;

  constructor(
    message: string,
    status: 400 | 403 | 404 | 409 | 410 | 422 | 500 = 400,
  ) {
    super(message);
    this.name = "ReviewPanelError";
    this.status = status;
  }
}

function reviewPanelsRetired(): never {
  throw new ReviewPanelError(
    "Supervisor review panels have been replaced by examiner review assignments.",
    410,
  );
}

export function hasTwoConsecutiveFailingEvaluations() {
  return false;
}

export async function createReviewPanel(
  _input: unknown,
  _auth: AuthenticatedUserContext,
) {
  reviewPanelsRetired();
}

export async function submitPanelEvaluation(
  _input: unknown,
  _auth: AuthenticatedUserContext,
) {
  reviewPanelsRetired();
}

export async function getReviewPanelById(
  _panelId: string,
  _auth: AuthenticatedUserContext,
) {
  reviewPanelsRetired();
}
