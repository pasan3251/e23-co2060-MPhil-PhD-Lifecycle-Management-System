import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Poppins } from "next/font/google";
import "@/app/globals.css";
import { SessionActivityTracker } from "@/components/auth/session-activity-tracker";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PGSMS",
  description: "MPhil and PhD lifecycle management system",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={poppins.className}>
        <SessionActivityTracker />
        {children}
      </body>
    </html>
  );
}
