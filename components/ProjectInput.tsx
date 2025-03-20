"use client";

import { useState, useEffect, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Octokit } from "@octokit/rest";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, GitFork } from "lucide-react";
import { toast } from "sonner";

const getOctokit = () => {
  const token = process.env.NEXT_PUBLIC_GITHUB_TOKEN;
  return new Octokit(token ? { auth: token } : {});
};

const octokit = getOctokit();

interface VerificationResult {
  isOriginal: boolean;
  message: string;
  details?: string;
}

export default function ProjectInput() {
  const [githubUrl, setGithubUrl] = useState("");
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [remainingRequests, setRemainingRequests] = useState<number | null>(null);
  const [isValidInput, setIsValidInput] = useState<boolean | null>(null);

  const router = useRouter();

  // Validate input when URL changes
  useEffect(() => {
    if (!githubUrl.trim()) {
      setIsValidInput(null);
      return;
    }
    
    const isValid = extractRepoInfo(githubUrl) !== null;
    setIsValidInput(isValid);
  }, [githubUrl]);

  // Check API rate limit on component mount
  useEffect(() => {
    const checkRateLimit = async () => {
      try {
        const { data } = await octokit.rateLimit.get();
        setRemainingRequests(data.resources.core.remaining);
        
        if (data.resources.core.remaining < 5) {
          toast.warning("GitHub API rate limit is low. Some features may be limited.");
        }
      } catch (error) {
        console.error("Failed to check rate limit:", error);
      }
    };
    
    checkRateLimit();
  }, []);

  const clearInput = () => {
    setGithubUrl("");
    setVerificationResult(null);
    setIsValidInput(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Submit form on Enter if input is valid
    if (e.key === 'Enter' && isValidInput) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form && !isLoading) {
        form.requestSubmit();
      }
    }
    
    // Clear input on Escape
    if (e.key === 'Escape') {
      clearInput();
    }
  };

  const extractRepoInfo = (url: string) => {
    // Handle both full URL and shorthand formats
    const fullUrlMatch = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    const shorthandMatch = url.match(/^([^/]+)\/([^/]+)$/);
    
    if (fullUrlMatch) {
      return { owner: fullUrlMatch[1], repo: fullUrlMatch[2].replace(/\.git$/, '').split('/')[0] };
    } else if (shorthandMatch) {
      return { owner: shorthandMatch[1], repo: shorthandMatch[2].replace(/\.git$/, '').split('/')[0] };
    }
    
    return null;
  };

  const verifyProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isLoading || !githubUrl.trim() || !isValidInput) return;

    // Check if we're close to rate limit
    if (remainingRequests !== null && remainingRequests < 3) {
      toast.error("GitHub API rate limit reached. Please try again later.");
      return;
    }

    setIsLoading(true);
    setVerificationResult(null);

    const repoInfo = extractRepoInfo(githubUrl);
    
    if (!repoInfo) {
      setVerificationResult({
        isOriginal: false,
        message: "Invalid GitHub URL format. Please use github.com/username/repo or username/repo",
      });
      toast.error("Invalid GitHub URL format");
      setIsLoading(false);
      return;
    }

    try {
      const res = await octokit.repos.get({
        owner: repoInfo.owner,
        repo: repoInfo.repo,
      });

      // Update remaining requests
      const rateLimit = parseInt(res.headers["x-ratelimit-remaining"] as string, 10);
      if (!isNaN(rateLimit)) {
        setRemainingRequests(rateLimit);
      }

      const repoData = res.data;
      const isFork = repoData.fork;
      const isOriginal = !isFork;

      let details = '';
      if (!isOriginal && repoData.source) {
        details = `Forked from ${repoData.source.full_name}`;
      }

      setVerificationResult({
        isOriginal,
        message: isOriginal
          ? "Project meets the basic requirements"
          : "Project is a fork of another project",
        details
      });

      if (isOriginal) {
        toast.success("Verification successful! Redirecting...");
        setTimeout(() => {
          router.push(
            `/selectfiles?owner=${repoInfo.owner}&repo=${repoInfo.repo}`
          );
        }, 1000); // Give the user a moment to see the success message
      } else {
        toast.error("Project is a fork of another repository");
      }
    } catch (error: any) {
      console.error("GitHub API error:", error);
      
      if (error.status === 404) {
        toast.error("Repository not found");
      } else if (error.status === 403) {
        setVerificationResult({
          isOriginal: false,
          message: "Rate limit exceeded. Please try again later.",
        });
        toast.error("GitHub API rate limit exceeded");
        setRemainingRequests(0);
      } else {
        setVerificationResult({
          isOriginal: false,
          message: `Error verifying project: ${error.message || "Unknown error"}`,
        });
        toast.error("Error verifying project");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div className="text-center w-full">
        <h1 className="text-4xl sm:text-7xl font-bold mb-3 cyber-glitch font-mono flex justify-center">
          Repo
          <span className="text-blue-500 text-opacity-55 flex flex-col">
            Verifier
          </span>
        </h1>
        <p className="text-sm sm:text-base mb-6 font-mono">
          Verify the originality of your GitHub project
        </p>
      </div>

      <form onSubmit={verifyProject} className="w-full max-w-2xl mx-auto">
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
            onKeyDown={handleKeyDown}
            placeholder="github.com/username/repository or username/repository"
            className={`w-full px-12 py-4 bg-white/5 border ${
              isValidInput === null
                ? 'border-white/10'
                : isValidInput
                ? 'border-green-500/30 focus:ring-green-500'
                : 'border-red-500/30 focus:ring-red-500'
            } rounded-lg text-white placeholder-slate-400 
                 focus:outline-none focus:ring-2 focus:border-transparent 
                 hover:bg-white/10 transition-all duration-300`}
            disabled={isLoading}
            aria-invalid={isValidInput === false}
            aria-describedby={isValidInput === false ? "url-error" : undefined}
          />
          <Button
            type="submit"
            disabled={isLoading || !githubUrl.trim() || isValidInput === false}
            className="absolute hidden right-3 px-4 py-2 rounded-md 
                 sm:flex items-center gap-2 transition-all duration-300 hover:scale-105 font-medium"
            aria-label="Verify GitHub project"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                Verify Project
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
        <Button 
          className="w-full mt-5 sm:hidden block" 
          type="submit"
          disabled={isLoading || !githubUrl.trim() || isValidInput === false}
          aria-label="Verify GitHub project"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Verifying...
            </>
          ) : (
            "Verify Project"
          )}
        </Button>

        {/* GitHub API rate limit indicator */}
        {remainingRequests !== null && remainingRequests < 20 && (
          <div className="mt-2 text-xs text-center text-amber-400">
            <span>GitHub API rate limit: {remainingRequests} requests remaining</span>
          </div>
        )}
      </form>
      
      {isLoading && (
        <div className="my-6 w-full max-w-2xl mx-auto flex items-center justify-center animate-pulse">
          <div className="p-4 rounded-lg border border-blue-500/20 bg-blue-500/10">
            <div className="flex items-center gap-2 text-blue-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Verifying repository...</span>
            </div>
          </div>
        </div>
      )}
      
      {!isLoading && verificationResult && (
        <div className="my-6 w-full max-w-2xl mx-auto animate-fadeIn">
          <div className={`p-4 rounded-lg border ${
              verificationResult.isOriginal
                ? "bg-green-500/10 border-green-500/20"
                : "bg-red-500/10 border-red-500/20"
            }`}
          >
            <div
              className={`flex items-center gap-2 ${
                verificationResult.isOriginal
                  ? "text-green-500"
                  : "text-red-500"
              }`}
            >
              {verificationResult.isOriginal ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
              )}
              <span className="font-medium">
                {verificationResult.message}
              </span>
            </div>
            
            {verificationResult.details && (
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                <GitFork className="w-4 h-4 flex-shrink-0" />
                <span>{verificationResult.details}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
