"use client";

import Link from "next/link";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
      <nav className="w-full px-8 md:px-12 py-6 flex items-center justify-end">
        <Link
          href="/login"
          className="group inline-block text-[20px] font-bold bg-black rounded-[0.75em] cursor-pointer"
        >
          <span className="block box-border border-2 border-black rounded-[0.75em] px-[1.5em] py-[0.75em] bg-[white] text-black -translate-y-[0.2em] transition-transform duration-100 ease-out group-hover:-translate-y-[0.33em] group-active:translate-y-0">
            Sign In
          </span>
        </Link>
      </nav>
    </header>
  );
}
