import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExternalLink } from "lucide-react";
import { Card } from "./ui/card";

export const SimilarCodeFound = () => {
  const mockSearchResults = {
    "src/components/Header.tsx": [
      {
        filename: "Header.tsx",
        repoName: "example/repo1",
        repoUrl: "https://github.com/example/repo1",
      },
      {
        filename: "Header.js",
        repoName: "example/repo2",
        repoUrl: "https://github.com/example/repo2",
      },
    ],
    "src/pages/index.tsx": [
      {
        filename: "index.tsx",
        repoName: "example/repo3",
        repoUrl: "https://github.com/example/repo3",
      },
    ],
  };

  return (
    <>
        <Card className="mt-8 p-8">
        <h3 className="text-lg font-semibold mb-4">Similar Code Found:</h3>
        {Object.entries(mockSearchResults).map(([file, results]) => (
          <div key={file} className="mb-4">
            <h4 className="font-medium">{file}</h4>
            {results.map((result, index) => (
              <Alert key={index} className="mt-2">
                <AlertTitle>{result.filename}</AlertTitle>
                <AlertDescription>
                  Found in repository:
                  <a
                    href={result.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline ml-1"
                  >
                    {result.repoName}
                    <ExternalLink className="inline-block ml-1 h-4 w-4" />
                  </a>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        ))}
        </Card>
    </>
  );
};
