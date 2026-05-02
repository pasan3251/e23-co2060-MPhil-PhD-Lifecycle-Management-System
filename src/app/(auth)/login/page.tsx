import { Suspense } from "react";
import { Montserrat } from "next/font/google";

import { LoginForm } from "@/components/auth/login-form";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default function LoginPage() {
  return (
    <main className={`${montserrat.className} box-border flex h-[100dvh] items-center justify-center overflow-hidden bg-[#e0e0e0] px-4 py-6 text-black sm:px-6 sm:py-8`}>
      <div className="max-h-full w-full max-w-xl overflow-y-auto rounded-[30px] bg-[#e0e0e0] p-8 shadow-[15px_15px_30px_#bebebe,-15px_-15px_30px_#ffffff] space-y-6 sm:p-10 sm:space-y-7">
        <div className="space-y-2 text-center">
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
