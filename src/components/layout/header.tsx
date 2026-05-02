"use client";

import Link from "next/link";
import { Montserrat } from "next/font/google";
import styles from "@/app/home-page.module.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
      <nav className="flex w-full items-center justify-end px-5 py-5 sm:px-8 md:px-10 md:py-6">
        <Link
          href="/login"
          className={styles.signInButton}
        >
          <span className={`${styles.signInButtonLabel} ${montserrat.className}`}>
            Sign In
          </span>
        </Link>
      </nav>
    </header>
  );
}
