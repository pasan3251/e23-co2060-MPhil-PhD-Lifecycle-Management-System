"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function LandingBackRedirect() {
  const router = useRouter();

  useEffect(() => {
    const handlePopState = () => {
      router.replace("/login");
    };

    // Insert a duplicate landing-page history entry so the first Back press
    // can be intercepted and redirected to the sign-in page.
    window.history.pushState({ landingBackRedirect: true }, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [router]);

  return null;
}
