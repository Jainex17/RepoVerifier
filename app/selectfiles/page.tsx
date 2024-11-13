"use client";

import FileSelector from "@/components/FileSelector";
import React, { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

function PageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [owner, setOwner] = React.useState<string>();
  const [repo, setRepo] = React.useState<string>();
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");

    if (!owner || !repo) {
      router.push("/");
    }

    setOwner(owner as string);
    setRepo(repo as string);
    setIsLoading(false);
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full">
      <FileSelector owner={owner as string} repo={repo as string} />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <PageContent />
    </Suspense>
  );
}
