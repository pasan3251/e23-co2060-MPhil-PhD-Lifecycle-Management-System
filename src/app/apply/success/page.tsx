import Link from "next/link";

export default function ApplicationSuccessPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-xl border bg-card text-card-foreground shadow-sm p-8 text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-700">
          {"\u2713"}
        </div>
        <div>
          <p className="text-sm font-medium text-green-700 mb-2">
            Submission Complete
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            Application Submitted Successfully
          </h1>
        </div>
        <p className="mx-auto text-base text-muted-foreground">
          Your application has been received and is now ready for review by the postgraduate admissions team.
        </p>
        <div className="pt-4 flex justify-center">
          <Link href="/" className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
