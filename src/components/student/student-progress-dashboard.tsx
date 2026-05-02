import type {
  ProgressStepperStep,
  StageProgressSummary,
} from "@/lib/students/progress";

function getStepStateClassName(state: ProgressStepperStep["state"]) {
  switch (state) {
    case "complete":
      return "border-gray-300 bg-white text-black";
    case "current":
      return "border-gray-300 bg-white text-black";
    default:
      return "border-gray-300 bg-white text-black";
  }
}

function getStageTone(percentage: number) {
  if (percentage >= 100) {
    return "border-gray-300 bg-white text-black";
  }

  if (percentage >= 50) {
    return "border-gray-300 bg-white text-black";
  }

  return "border-gray-300 bg-white text-black";
}

function formatDateLabel(value: string | Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function StageCard({
  label,
  value,
}: {
  label: string;
  value: StageProgressSummary;
}) {
  return (
    <article
      className={`group rounded-[24px] border p-6 transition-all hover:bg-black ${getStageTone(
        value.completionPercentage,
      )}`}
    >
      <p className="text-[14px] font-black uppercase tracking-[0.2em] text-black/40 transition-colors group-hover:text-white/70">
        {label}
      </p>
      <p className="mt-3 text-5xl font-black tracking-tighter text-black transition-colors group-hover:text-white">
        {value.completionPercentage}%
      </p>
      <p className="mt-4 text-base font-medium leading-6 text-black/70 transition-colors group-hover:text-white/80">
        Submitted: {value.totalSubmittedVersions} · Approved: {value.approvedVersions}
      </p>
    </article>
  );
}

export function StudentProgressDashboard({
  progress,
}: {
  progress: {
    student: {
      displayName: string;
      programType: string;
      enrollmentDate: string | Date;
    };
    currentMilestone: string;
    estimatedCompletionDate: string | Date;
    stageProgress: {
      proposal: StageProgressSummary;
      ethics: StageProgressSummary;
      dataCollection: StageProgressSummary;
      thesis: StageProgressSummary;
    };
    stepper: ProgressStepperStep[];
    counts: {
      totalDocumentVersions: number;
      approvedDocumentVersions: number;
    };
    examinerFeedbackReleased: boolean;
  };
}) {
  return (
    <div className="space-y-12">
      <section className="border-b-2 border-gray-200 pb-10">
        <p className="text-base font-black uppercase tracking-[0.3em] text-black/40">
          Student Progress
        </p>
        <h2 className="mt-3 text-5xl font-black tracking-tighter text-black sm:text-6xl">
          Lifecycle dashboard for {progress.student.displayName}
        </h2>
        <p className="mt-3 max-w-3xl text-xl font-medium leading-relaxed text-black/80">
          Track milestone readiness across proposal, ethics, data collection, and
          thesis phases with sequential lifecycle gating.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[24px] border border-gray-300 bg-white px-5 py-5">
            <p className="text-base font-black uppercase tracking-[0.18em] text-black/40">
              Current milestone
            </p>
            <p className="mt-2 text-2xl font-black tracking-tight text-black">
              {progress.currentMilestone}
            </p>
          </div>
          <div className="rounded-[24px] border border-gray-300 bg-white px-5 py-5">
            <p className="text-base font-black uppercase tracking-[0.18em] text-black/40">
              Estimated completion
            </p>
            <p className="mt-2 text-2xl font-black tracking-tight text-black">
              {formatDateLabel(progress.estimatedCompletionDate)}
            </p>
          </div>
          <div className="rounded-[24px] border border-gray-300 bg-white px-5 py-5">
            <p className="text-base font-black uppercase tracking-[0.18em] text-black/40">
              Document approvals
            </p>
            <p className="mt-2 text-2xl font-black tracking-tight text-black">
              {progress.counts.approvedDocumentVersions}/
              {progress.counts.totalDocumentVersions}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StageCard label="Proposal" value={progress.stageProgress.proposal} />
        <StageCard label="Ethics" value={progress.stageProgress.ethics} />
        <StageCard
          label="Data Collection"
          value={progress.stageProgress.dataCollection}
        />
        <StageCard label="Thesis" value={progress.stageProgress.thesis} />
      </section>

      <section className="rounded-[24px] border border-gray-300 bg-white p-6 sm:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-base font-black uppercase tracking-[0.2em] text-black/40">
              Progress Stepper
            </p>
            <h3 className="mt-2 text-3xl font-black tracking-tight text-black">
              Sequential milestone tracking
            </h3>
          </div>
          <p className="text-base font-medium text-black/70">
            Examiner feedback stays hidden until results are officially released.
          </p>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          {progress.stepper.map((step, index) => (
            <article
              key={step.id}
              className={`group rounded-[24px] border px-5 py-5 transition-all hover:bg-black ${getStepStateClassName(
                step.state,
              )}`}
            >
              <p className="text-[14px] font-black uppercase tracking-[0.18em] text-black/40 transition-colors group-hover:text-white/70">
                Step {index + 1}
              </p>
              <h4 className="mt-2 text-2xl font-black tracking-tight text-black transition-colors group-hover:text-white">
                {step.label}
              </h4>
              <p className="mt-3 text-base font-medium leading-6 text-black/70 transition-colors group-hover:text-white/80">
                {step.description}
              </p>
            </article>
          ))}
        </div>

        {progress.examinerFeedbackReleased ? (
          <div className="mt-5 rounded-2xl border-2 border-black bg-white px-4 py-3 text-base font-bold text-black shadow-[4px_4px_0px_black]">
            Examination result released. The thesis lifecycle has been finalized.
          </div>
        ) : (
          <div className="mt-5 rounded-[24px] border border-dashed border-gray-300 bg-white px-4 py-4 text-base font-medium text-black/70">
            Examiner feedback will appear here once an administrator officially releases the result.
          </div>
        )}
      </section>
    </div>
  );
}
