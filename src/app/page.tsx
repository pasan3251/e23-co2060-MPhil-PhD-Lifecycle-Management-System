import Link from "next/link";
import StarfieldBackground from "@/components/ui/starfield-background";
import styles from "@/components/ui/signin-button.module.css";

export default function HomePage() {
  return (
    <>
      <StarfieldBackground />
      
      {/* Top Right Login */}
      <nav className="fixed top-0 right-0 p-8 z-20">
        <Link 
          href="/login" 
          className={styles.signinButton}
        >
          Sign In
        </Link>
      </nav>

      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24 text-slate-50 relative z-10">
        <div className="max-w-3xl space-y-12 text-center">
          {/* Main Hero Section */}
          <div className="space-y-6">
            <h1 className="text-6xl font-bold tracking-tighter sm:text-8xl text-white">
              Postgraduate Lifecycle
            </h1>
            <p className="text-xl font-light tracking-[0.3em] text-blue-300/60 uppercase">
              University of Peradeniya
            </p>
          </div>
          
          <p className="text-lg leading-8 text-slate-400 max-w-xl mx-auto">
            A comprehensive platform for managing MPhil and PhD research journeys, from application to examination.
          </p>

          {/* New Interactive Button */}
          <div className="pt-4">
            <Link href="/apply">
              <button
                type="button"
                className="flex justify-center gap-4 items-center mx-auto shadow-2xl text-xl bg-gray-50 backdrop-blur-md font-semibold isolation-auto border-gray-50 before:absolute before:w-full before:transition-all before:duration-700 before:hover:w-full before:-left-full before:hover:left-0 before:rounded-full before:bg-emerald-500 text-slate-950 hover:text-white before:-z-10 before:aspect-square before:hover:scale-150 before:hover:duration-700 relative z-10 px-8 py-4 overflow-hidden border-2 rounded-full group transition-colors"
              >
                Apply Now
                <svg
                  className="w-8 h-8 justify-end group-hover:rotate-90 group-hover:bg-gray-50 text-gray-50 ease-linear duration-300 rounded-full border border-gray-700 group-hover:border-none p-2 rotate-45 transition-all"
                  viewBox="0 0 16 19"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7 18C7 18.5523 7.44772 19 8 19C8.55228 19 9 18.5523 9 18H7ZM8.70711 0.292893C8.31658 -0.0976311 7.68342 -0.0976311 7.29289 0.292893L0.928932 6.65685C0.538408 7.04738 0.538408 7.68054 0.928932 8.07107C1.31946 8.46159 1.95262 8.46159 2.34315 8.07107L8 2.41421L13.6569 8.07107C14.0474 8.46159 14.6805 8.46159 15.0711 8.07107C15.4616 7.68054 15.4616 7.04738 15.0711 6.65685L8.70711 0.292893ZM9 18L9 1H7L7 18H9Z"
                    className="fill-gray-800 group-hover:fill-gray-800 transition-colors"
                  ></path>
                </svg>
              </button>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
