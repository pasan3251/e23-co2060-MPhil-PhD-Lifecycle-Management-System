ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'REVIEW_ATTACHMENT';

ALTER TYPE "NotificationEvent" ADD VALUE IF NOT EXISTS 'SUPERVISOR_SUBMISSION_AVAILABLE';
ALTER TYPE "NotificationEvent" ADD VALUE IF NOT EXISTS 'EXAMINER_REVIEW_ASSIGNED';
ALTER TYPE "NotificationEvent" ADD VALUE IF NOT EXISTS 'EXAMINER_REVIEW_SUBMITTED';
ALTER TYPE "NotificationEvent" ADD VALUE IF NOT EXISTS 'ADMIN_REVIEW_RELEASED';

ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "supervisor" TEXT;

-- Existing supervisor/score-based review records are incompatible with the
-- examiner-only, text-only review workflow. Keep lifecycle records/documents,
-- but clear obsolete review rows before changing their shape.
DELETE FROM "panel_evaluations";
DELETE FROM "evaluation_forms";

ALTER TABLE "evaluation_forms" DROP CONSTRAINT IF EXISTS "evaluation_forms_researchProposalId_supervisorId_key";
ALTER TABLE "evaluation_forms" DROP CONSTRAINT IF EXISTS "evaluation_forms_supervisorId_fkey";
ALTER TABLE "evaluation_forms" DROP COLUMN IF EXISTS "numericalScore";
ALTER TABLE "evaluation_forms" DROP COLUMN IF EXISTS "supervisorId";
ALTER TABLE "evaluation_forms" ADD COLUMN IF NOT EXISTS "examinerId" TEXT NOT NULL;
ALTER TABLE "evaluation_forms" ADD COLUMN IF NOT EXISTS "adminComments" TEXT;
ALTER TABLE "evaluation_forms" ADD COLUMN IF NOT EXISTS "releasedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "evaluation_forms_researchProposalId_examinerId_key" ON "evaluation_forms"("researchProposalId", "examinerId");
ALTER TABLE "evaluation_forms" ADD CONSTRAINT "evaluation_forms_examinerId_fkey" FOREIGN KEY ("examinerId") REFERENCES "examiners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ethics_approvals" DROP CONSTRAINT IF EXISTS "ethics_approvals_reviewedById_fkey";
DROP INDEX IF EXISTS "ethics_approvals_studentId_status_idx";
DROP INDEX IF EXISTS "ethics_approvals_status_createdAt_idx";
ALTER TABLE "ethics_approvals" DROP COLUMN IF EXISTS "status";
ALTER TABLE "ethics_approvals" DROP COLUMN IF EXISTS "reviewNotes";
ALTER TABLE "ethics_approvals" DROP COLUMN IF EXISTS "reviewedAt";
ALTER TABLE "ethics_approvals" DROP COLUMN IF EXISTS "reviewedById";
DROP TYPE IF EXISTS "EthicsApprovalStatus";
CREATE INDEX IF NOT EXISTS "ethics_approvals_studentId_createdAt_idx" ON "ethics_approvals"("studentId", "createdAt");

ALTER TABLE "panel_evaluations" DROP CONSTRAINT IF EXISTS "panel_evaluations_reviewPanelId_progressReportId_supervisorId_key";
ALTER TABLE "panel_evaluations" DROP CONSTRAINT IF EXISTS "panel_evaluations_supervisorId_fkey";
DROP INDEX IF EXISTS "panel_evaluations_progressReportId_supervisorId_idx";
ALTER TABLE "panel_evaluations" DROP COLUMN IF EXISTS "score";
ALTER TABLE "panel_evaluations" DROP COLUMN IF EXISTS "outcome";
ALTER TABLE "panel_evaluations" DROP COLUMN IF EXISTS "supervisorId";
DROP TYPE IF EXISTS "PanelEvaluationOutcome";
ALTER TABLE "panel_evaluations" ADD COLUMN IF NOT EXISTS "examinerId" TEXT NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "panel_evaluations_reviewPanelId_progressReportId_examinerId_key" ON "panel_evaluations"("reviewPanelId", "progressReportId", "examinerId");
CREATE INDEX IF NOT EXISTS "panel_evaluations_progressReportId_examinerId_idx" ON "panel_evaluations"("progressReportId", "examinerId");
ALTER TABLE "panel_evaluations" ADD CONSTRAINT "panel_evaluations_examinerId_fkey" FOREIGN KEY ("examinerId") REFERENCES "examiners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "progress_report_reviews" (
    "id" TEXT NOT NULL,
    "progressReportId" TEXT NOT NULL,
    "examinerId" TEXT NOT NULL,
    "examinerUserId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,
    "reviewText" TEXT,
    "submittedAt" TIMESTAMP(3),
    "adminComments" TEXT,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "progress_report_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "progress_report_reviews_progressReportId_examinerId_key" ON "progress_report_reviews"("progressReportId", "examinerId");
CREATE UNIQUE INDEX IF NOT EXISTS "progress_report_reviews_progressReportId_examinerUserId_key" ON "progress_report_reviews"("progressReportId", "examinerUserId");
CREATE INDEX IF NOT EXISTS "progress_report_reviews_examinerId_idx" ON "progress_report_reviews"("examinerId");
CREATE INDEX IF NOT EXISTS "progress_report_reviews_assignedBy_idx" ON "progress_report_reviews"("assignedBy");
ALTER TABLE "progress_report_reviews" ADD CONSTRAINT "progress_report_reviews_progressReportId_fkey" FOREIGN KEY ("progressReportId") REFERENCES "progress_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "progress_report_reviews" ADD CONSTRAINT "progress_report_reviews_examinerId_fkey" FOREIGN KEY ("examinerId") REFERENCES "examiners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "progress_report_reviews" ADD CONSTRAINT "progress_report_reviews_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "administrators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "thesis_examiner_assignments" ADD COLUMN IF NOT EXISTS "reviewText" TEXT;
ALTER TABLE "thesis_examiner_assignments" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);
ALTER TABLE "thesis_examiner_assignments" ADD COLUMN IF NOT EXISTS "adminComments" TEXT;
ALTER TABLE "thesis_examiner_assignments" ADD COLUMN IF NOT EXISTS "releasedAt" TIMESTAMP(3);

ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "progressReportReviewId" TEXT;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "thesisExaminerAssignmentId" TEXT;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "evaluationFormId" TEXT;
CREATE INDEX IF NOT EXISTS "documents_progressReportReviewId_idx" ON "documents"("progressReportReviewId");
CREATE INDEX IF NOT EXISTS "documents_thesisExaminerAssignmentId_idx" ON "documents"("thesisExaminerAssignmentId");
CREATE INDEX IF NOT EXISTS "documents_evaluationFormId_idx" ON "documents"("evaluationFormId");
ALTER TABLE "documents" ADD CONSTRAINT "documents_progressReportReviewId_fkey" FOREIGN KEY ("progressReportReviewId") REFERENCES "progress_report_reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_thesisExaminerAssignmentId_fkey" FOREIGN KEY ("thesisExaminerAssignmentId") REFERENCES "thesis_examiner_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_evaluationFormId_fkey" FOREIGN KEY ("evaluationFormId") REFERENCES "evaluation_forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
