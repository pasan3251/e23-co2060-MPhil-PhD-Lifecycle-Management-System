import type { AuthenticatedUserContext } from "@/types/auth";

export class ProgressReportSignOffError extends Error {
  status: 410;

  constructor(
    message = "Supervisor progress-report sign-off has been removed. Supervisors can view and monitor submitted reports only.",
  ) {
    super(message);
    this.name = "ProgressReportSignOffError";
    this.status = 410;
  }
}

export async function forwardProgressReportToPanel() {
  throw new ProgressReportSignOffError();
}

export async function signOffProgressReport(
  _input: { id: string },
  _auth: AuthenticatedUserContext,
) {
  throw new ProgressReportSignOffError();
}
