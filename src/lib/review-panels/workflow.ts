export class ReviewPanelWorkflowError extends Error {
  status: 410;

  constructor(
    message = "Supervisor sign-off panels have been replaced by examiner review assignments.",
  ) {
    super(message);
    this.name = "ReviewPanelWorkflowError";
    this.status = 410;
  }
}

export async function forwardSignedOffProgressReportToPanel() {
  throw new ReviewPanelWorkflowError();
}
