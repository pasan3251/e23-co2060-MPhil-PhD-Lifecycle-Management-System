"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader } from "@/components/ui/loader";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    async function performLogout() {
      try {
        await fetch("/api/auth/session", {
          method: "DELETE",
          credentials: "include",
        });
      } catch (error) {
        console.error("Logout failed:", error);
      } finally {
        // Always redirect to home even if API fails
        window.location.href = "/";
      }
    }

    void performLogout();
  }, [router]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="text-center space-y-6 flex flex-col items-center">
        <Loader />
        <p className="text-2xl font-medium text-muted-foreground">
          Signing you out...
        </p>
      </div>
    </div>
  );
}
