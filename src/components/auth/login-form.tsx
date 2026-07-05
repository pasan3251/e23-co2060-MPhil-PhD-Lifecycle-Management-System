"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { loginCredentialsSchema } from "@/lib/auth/schemas";
import {
  getUserIdTokenResult,
  signInWithEmailPassword,
  signOutUser,
} from "@/lib/firebase/client";
import { isAppUserRole, type AppUserRole } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

const roleRedirectMap: Record<AppUserRole, string> = {
  STUDENT: "/dashboard/student",
  SUPERVISOR: "/dashboard/supervisor",
  EXAMINER: "/dashboard/examiner",
  ADMINISTRATOR: "/dashboard/admin",
};

function mapFirebaseErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    switch (error.code) {
      case "auth/user-not-found":
        return "No account was found for that email address.";
      case "auth/wrong-password":
        return "The password you entered is incorrect.";
      case "auth/invalid-credential":
        return "Your email or password is incorrect.";
      default:
        return "Unable to sign in right now. Please try again.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to sign in right now. Please try again.";
}

export function resolveDashboardPathFromRole(role: AppUserRole): string {
  return roleRedirectMap[role];
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timeoutMessage = useMemo(() => {
    return searchParams.get("reason") === "timeout"
      ? "Session Timedout"
      : null;
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const parsedCredentials = loginCredentialsSchema.safeParse({
      email,
      password,
    });

    if (!parsedCredentials.success) {
      setErrorMessage(parsedCredentials.error.issues[0]?.message ?? "Invalid login details.");
      return;
    }

    setIsSubmitting(true);

    try {
      const credential = await signInWithEmailPassword(
        parsedCredentials.data.email,
        parsedCredentials.data.password,
      );
      const idToken = await credential.user.getIdToken();
      const tokenResult = await getUserIdTokenResult(credential.user, true);
      const roleClaim = tokenResult.claims.role;

      if (!isAppUserRole(roleClaim)) {
        await signOutUser();
        setErrorMessage("Your account is missing a valid role claim.");
        return;
      }

      const sessionResponse = await fetch("/api/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idToken,
        }),
      });

      const sessionPayload = (await sessionResponse.json()) as {
        error?: string;
      };

      if (!sessionResponse.ok) {
        await signOutUser();
        setErrorMessage(
          sessionPayload.error ??
            "Unable to create a secure session. Please try again.",
        );
        return;
      }

      router.push(resolveDashboardPathFromRole(roleClaim));
      router.refresh();
    } catch (error) {
      setErrorMessage(mapFirebaseErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-2 text-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Sign In
          </h1>
          <p className="text-sm text-muted-foreground">
            Use your assigned institutional account to sign in.
          </p>
        </div>
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          {timeoutMessage && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              {timeoutMessage}
            </div>
          )}

          {errorMessage && (
            <div
              className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
              role="alert"
            >
              {errorMessage}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@eng.pdn.ac.lk"
              className="border-zinc-400 focus-visible:ring-zinc-900"
              data-testid="login-email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="flex items-center gap-2 rounded-md border border-zinc-400 bg-transparent px-3 py-1 focus-within:ring-1 focus-within:ring-zinc-900 transition-shadow">
              <input
                id="password"
                name="password"
                type={isPasswordVisible ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-8 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                placeholder="Enter your password"
                data-testid="login-password"
              />
              <button
                type="button"
                onClick={() => setIsPasswordVisible((current) => !current)}
                className="shrink-0 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                aria-pressed={isPasswordVisible}
              >
                {isPasswordVisible ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/")}
              disabled={isSubmitting}
            >
              Back
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              data-testid="login-submit"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
