import Link from "next/link";
import Image from "next/image";
import { Montserrat } from "next/font/google";
import { Header } from "@/components/layout/header";
import { LandingBackRedirect } from "@/components/layout/landing-back-redirect";
import DotField from "@/components/ui/dot-field";
import styles from "./home-page.module.css";
import logoImage from "../../images/logo.png";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export default function HomePage() {
  return (
    <>
      <LandingBackRedirect />
      <Header />
      <main className="relative flex h-screen flex-col items-center justify-center overflow-hidden bg-[#f7f4ee] px-5 py-20 text-black sm:px-6 sm:py-24">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.92),_rgba(247,244,238,0.72)_42%,_rgba(247,244,238,0.96)_100%)]" />
          <div className="absolute inset-0 opacity-90">
            <DotField
              dotRadius={3}
              dotSpacing={14}
              bulgeStrength={72}
              glowRadius={180}
              cursorRadius={340}
              sparkle={false}
              waveAmplitude={0}
              gradientFrom="rgba(120, 120, 120, 0.24)"
              gradientTo="rgba(190, 190, 190, 0.14)"
              activeGradientStops={[
                "rgba(239, 68, 68, 0.96)",
                "rgba(244, 114, 182, 0.95)",
                "rgba(96, 165, 250, 0.95)",
                "rgba(168, 85, 247, 0.94)",
              ]}
              activeDotScale={2.45}
              idleEngagement={0.52}
              glowColor="transparent"
            />
          </div>
          <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-white/85 via-white/35 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#f7f4ee] via-[#f7f4ee]/70 to-transparent" />
        </div>

        <div className="relative z-10 flex h-full w-full max-w-5xl flex-col items-center justify-center space-y-8 pt-12 text-center sm:space-y-10 sm:pt-16 lg:pt-10">
          <div className="flex justify-center">
            <Image
              src={logoImage}
              alt="Logo"
              width={132}
              height={132}
              className="h-24 w-24 object-contain drop-shadow-xl sm:h-32 sm:w-32 lg:h-36 lg:w-36"
              priority
            />
          </div>
          <h1 className={`${montserrat.className} relative -top-4 mx-auto max-w-5xl text-balance text-center text-[2.1rem] font-normal leading-[0.92] tracking-[-0.06em] text-[#111318] sm:-top-5 sm:text-[3.7rem] lg:-top-6 lg:text-[4.8rem]`}>
            Postgraduate Lifecycle Platform
          </h1>

          <Link
            href="/apply"
            className={styles.applyButton}
          >
            <span className={`${styles.applyButtonLabel} ${montserrat.className}`}>
              Apply Now
            </span>
          </Link>
        </div>
      </main>
    </>
  );
}
