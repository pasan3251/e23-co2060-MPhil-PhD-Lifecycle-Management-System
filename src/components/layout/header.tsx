"use client";

import Link from "next/link";
import { Montserrat } from "next/font/google";

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
          className={`${montserrat.className} inline-flex items-center justify-center rounded-full border-2 border-black bg-black px-5 py-3 text-base font-medium text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)] transition-transform duration-150 ease-out hover:-translate-y-0.5 sm:px-6 sm:text-[18px]`}
        >
          Sign In
        </Link>
      </nav>
    </header>
  );
}
