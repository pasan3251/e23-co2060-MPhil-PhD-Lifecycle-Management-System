import Link from "next/link";
import RainbowBackground from "@/components/ui/rainbow-background";
import signinStyles from "@/components/ui/signin-button.module.css";
import applyStyles from "@/components/ui/apply-button.module.css";

export default function HomePage() {
  return (
    <>
      <RainbowBackground />
      
      {/* Top Right Login */}
      <nav className="fixed top-0 right-0 p-8 z-20">
        <Link 
          href="/login" 
          className={signinStyles.signinButton}
        >
          Sign In
        </Link>
      </nav>

      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24 text-slate-950 relative z-10">
        <div className="max-w-3xl space-y-12 text-center">
          {/* Main Hero Section */}
          <div className="space-y-6">
            <h1 className="text-6xl font-bold tracking-tighter sm:text-8xl text-slate-900 drop-shadow-sm">
              Postgraduate Lifecycle
            </h1>
            <p className="text-xl font-light tracking-[0.3em] text-slate-500 uppercase">
              University of Peradeniya
            </p>
          </div>
          
          <p className="text-lg leading-8 text-slate-600 max-w-xl mx-auto font-medium">
            A comprehensive platform for managing MPhil and PhD research journeys, from application to examination.
          </p>

          {/* New Purple Gradient Shutter Button */}
          <div className="pt-4">
            <Link href="/apply" className={applyStyles.applyButton}>
              <span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                Apply Now
              </span>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
