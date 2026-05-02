import type {
  ProgressStepperStep,
  StageProgressSummary,
} from "@/lib/students/progress";

function getStepStateClassName(state: ProgressStepperStep["state"]) {
  switch (state) {
    case "complete":
      return "border-emerald-500 bg-[#e0e0e0] shadow-[0_0_20px_rgba(16,185,129,0.15),inset_6px_6px_12px_#bebebe,inset_-6px_-6px_12px_#ffffff]";
    case "current":
      return "border-black bg-black text-white shadow-[8px_8px_16px_#bebebe]";
    default:
      return "border-gray-300 bg-[#e0e0e0] shadow-[6px_6px_12px_#bebebe,-6px_-6px_12px_#ffffff] opacity-60";
  }
}

function getStageCardClassName(percentage: number) {
  if (percentage >= 100) {
    return "border-emerald-500 bg-[#e0e0e0] shadow-[0_0_25px_rgba(16,185,129,0.15),8px_8px_16px_#bebebe,-8px_-8px_16px_#ffffff]";
  }
  return "border-gray-300 bg-[#e0e0e0] shadow-[8px_8px_16px_#bebebe,-8px_-8px_16px_#ffffff]";
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
  const isComplete = value.completionPercentage >= 100;
  
  return (
    <article
      className={`group relative overflow-hidden rounded-[32px] border p-8 transition-all hover:translate-y-[-4px] ${getStageCardClassName(
        value.completionPercentage,
      )}`}
    >
      <div className="flex items-center justify-between">
        <p className={`text-xs font-black uppercase tracking-[0.3em] ${isComplete ? 'text-emerald-600' : 'text-black/40'}`}>
          {label}
        </p>
        {isComplete && (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
      <p className="mt-4 text-6xl font-black tracking-tighter text-black">
        {value.completionPercentage}%
      </p>
      <p className="mt-6 text-sm font-bold leading-relaxed text-black/60">
        <span className="text-black">{value.approvedVersions}</span> approved · <span className="text-black">{value.totalSubmittedVersions}</span> submissions
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
      <header className="pb-10 border-b-2 border-gray-300">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-4">
            <p className="text-base font-black uppercase tracking-[0.3em] text-black/40">
              Student Progress
            </p>
            <h2 className="text-5xl font-black tracking-tighter text-black sm:text-6xl">
              {progress.student.displayName}
            </h2>
            <p className="max-w-2xl text-xl font-medium leading-relaxed text-black/80">
              Postgraduate Lifecycle Tracking for {progress.student.programType} Candidate
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-[30px] border border-gray-300 bg-[#e0e0e0] px-8 py-6 shadow-[8px_8px_16px_#bebebe,-8px_-8px_16px_#ffffff]">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            Current Milestone
          </p>
          <p className="mt-2 text-2xl font-black text-black">
            {progress.currentMilestone}
          </p>
        </div>
        <div className="rounded-[30px] border border-gray-300 bg-[#e0e0e0] px-8 py-6 shadow-[8px_8px_16px_#bebebe,-8px_-8px_16px_#ffffff]">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            Estimated Completion
          </p>
          <p className="mt-2 text-2xl font-black text-black">
            {formatDateLabel(progress.estimatedCompletionDate)}
          </p>
        </div>
        <div className="rounded-[30px] border border-gray-300 bg-[#e0e0e0] px-8 py-6 shadow-[8px_8px_16px_#bebebe,-8px_-8px_16px_#ffffff]">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            Document Approvals
          </p>
          <p className="mt-2 text-2xl font-black text-black">
            {progress.counts.approvedDocumentVersions} / {progress.counts.totalDocumentVersions}
          </p>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StageCard label="Proposal" value={progress.stageProgress.proposal} />
        <StageCard label="Ethics" value={progress.stageProgress.ethics} />
        <StageCard
          label="Data Collection"
          value={progress.stageProgress.dataCollection}
        />
        <StageCard label="Thesis" value={progress.stageProgress.thesis} />
      </section>

      <section className="rounded-[48px] bg-[#e0e0e0] p-1 shadow-[20px_20px_40px_#bebebe,-20px_-20px_40px_#ffffff]">
        <div className="p-8 sm:p-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-black/40">
                Lifecycle Stepper
              </p>
              <h3 className="text-4xl font-black tracking-tight text-black">
                Sequential milestone tracking
              </h3>
            </div>
            <div className="rounded-full border border-gray-300 bg-white/50 px-5 py-2 text-xs font-black uppercase tracking-widest text-black/60 shadow-sm">
              Confidential Review Phase
            </div>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {progress.stepper.map((step, index) => {
              const isComplete = step.state === "complete";
              return (
                <article
                  key={step.id}
                  className={`group relative rounded-[32px] border p-8 transition-all ${getStepStateClassName(
                    step.state,
                  )}`}
                >
                  <div className="flex items-center justify-between">
                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isComplete ? 'text-emerald-600' : step.state === 'current' ? 'text-white/60' : 'text-black/40'}`}>
                      Milestone {index + 1}
                    </p>
                    {isComplete && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                        Verified
                      </span>
                    )}
                  </div>
                  <h4 className={`mt-3 text-3xl font-black tracking-tight ${step.state === 'current' ? 'text-white' : 'text-black'}`}>
                    {step.label}
                  </h4>
                  <p className={`mt-4 text-base font-medium leading-relaxed ${step.state === 'current' ? 'text-white/80' : 'text-black/60'}`}>
                    {step.description}
                  </p>
                </article>
              );
            })}
          </div>

          {progress.examinerFeedbackReleased ? (
            <div className="mt-10 rounded-3xl border-2 border-black bg-black p-8 text-white shadow-[10px_10px_20px_rgba(0,0,0,0.2)]">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-black tracking-tight">Examination result released</p>
                  <p className="font-medium text-white/70">The thesis lifecycle has been officially finalized and archived.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-10 rounded-[32px] border border-dashed border-gray-400 bg-black/5 px-8 py-6">
              <p className="text-sm font-bold text-black/60">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-black animate-pulse" />
                Examiner feedback is currently locked and will be released following administrative validation.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
