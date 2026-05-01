import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/layout/header";
import logoImage from "../../images/logo.png";

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="relative flex min-h-screen flex-col items-center justify-center bg-white px-6 py-24 text-black overflow-hidden">
        <div className="relative z-10 flex flex-col items-center text-center space-y-16 -mt-32">
          <div className="flex justify-center">
            <Image 
              src={logoImage} 
              alt="Logo" 
              width={220} 
              height={220} 
              className="object-contain drop-shadow-xl"
              priority
            />
          </div>
          <h1 className="text-6xl sm:text-8xl font-bold tracking-tight text-black">
            Postgraduate Lifecycle Platform
          </h1>
          
          <Link
            href="/apply"
            className="group inline-block text-[21px] font-bold bg-black rounded-[0.75em] cursor-pointer"
          >
            <span className="block box-border border-2 border-black rounded-[0.75em] px-[1.5em] py-[0.75em] bg-[white] text-black -translate-y-[0.2em] transition-transform duration-100 ease-out group-hover:-translate-y-[0.33em] group-active:translate-y-0">
              Apply Now
            </span>
          </Link>
        </div>
      </main>
    </>
  );
}
