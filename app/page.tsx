import ProjectInput from "@/components/ProjectInput";
import { Toaster } from "sonner";

export default function Home() {
  return (
    <>
      <Toaster position="top-right" theme="dark" />
      <main className="h-screen w-screen flex flex-col justify-center items-center relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff33_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
        </div>
        
        {/* Subtle glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-3xl -z-10" />
        
        {/* Main content - centered in viewport */}
        <div className="flex-grow flex items-center justify-center w-full h-full">
          <div className="w-full max-w-4xl px-4">
            <ProjectInput />
          </div>
        </div>
        
        {/* Footer */}
        <footer className="w-full text-center text-xs text-slate-500 py-4">
          <p>© {new Date().getFullYear()} RepoVerifier • Verify GitHub Repository Originality</p>
        </footer>
      </main>
    </>
  );
}
