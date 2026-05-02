import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#e0e0e0] px-6 py-16 text-black">
      <div className="w-full max-w-xl rounded-[30px] bg-[#e0e0e0] p-8 shadow-[15px_15px_30px_#bebebe,-15px_-15px_30px_#ffffff] sm:p-12 space-y-8">
        <div className="space-y-3 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-black sm:text-5xl">
            Sign In
          </h1>
          <p className="text-base leading-6 text-black">
            Use your assigned institutional account to sign in.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-base text-black">
              Loading sign-in form...
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
