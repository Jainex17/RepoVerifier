"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Octokit } from "@octokit/rest";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const octokit = new Octokit();

interface VerificationResult {
  isOriginal: boolean;
  message: string;
}

export default function ProjectInput() {
  
  const [githubUrl, setGithubUrl] = useState("");
  const [verificationResult, setVerificationResult] = useState<VerificationResult>();
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const extractRepoInfo = (url: string) => {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    return match ? { owner: match[1], repo: match[2] } : null;
  };

  const verifyProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if(isLoading) return;

    setIsLoading(true);
    setVerificationResult(undefined);

    const repoInfo = extractRepoInfo(githubUrl);
    if (!repoInfo) {
      setVerificationResult({
        isOriginal: false,
        message: "Invalid GitHub URL",
      });
      setIsLoading(false);
      return;
    }

    try {
      const res = await octokit.repos.get({
        owner: repoInfo.owner,
        repo: repoInfo.repo,
      });

      const repoData = res.data;

      if (res.status !== 200) {
        setVerificationResult({
          isOriginal: false,
          message: "Error verifying project",
        });
        setIsLoading(false);
        return;
      }

      const isFork = repoData.fork;
      const isOriginal = !isFork;

      setVerificationResult({
        isOriginal,
        message: isOriginal
          ? "Project meet the basic requirements"
          : "Project is a fork of another project",
      });

      if (isOriginal) {
        router.push(
          `/selectfiles?owner=${repoInfo.owner}&repo=${repoInfo.repo}`
        );
      }
    } catch (error: any) {
      if (error.status === 403) {
        setVerificationResult({
          isOriginal: false,
          message: "Rate limit exceeded",
        });
      } else {
        setVerificationResult({
          isOriginal: false,
          message: "Error verifying project",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-4xl sm:text-7xl font-bold mb-3 cyber-glitch font-mono flex justify-center">
          Repo
          <span className="text-blue-500 text-opacity-55 flex flex-col">
            Verifier
          </span>
        </h1>
        <p className="text-sm sm:text-base text-center mb-6 font-mono">
          Verify the originality of your GitHub project
        </p>
      </div>

      <form onSubmit={verifyProject} className="w-4/5 max-w-2xl mx-auto">
        <div className="relative flex items-center group">
          <div className="absolute left-4 text-slate-400 group-hover:text-blue-400 transition-colors">
            <svg
              className="w-5 h-5"
              fill="white"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <title>GitHub</title>
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
          </div>
          <input
            type="text"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="github.com/username/repository"
            className="w-full px-12 py-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 
                 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent 
                 hover:bg-white/10 transition-all duration-300"
          />
          <Button
            type="submit"
            disabled={isLoading}
            onClick={()=> verifyProject}
            className="absolute hidden right-3 px-4 py-2 rounded-md 
                 sm:flex items-center gap-2 transition-all duration-300 hover:scale-105 font-medium"
          >
            Verify Now
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
        <Button className="w-full mt-5 sm:hidden block" type="submit">sd</Button>
      </form>
      
    </>
  );
}
