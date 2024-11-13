import React, { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExternalLink } from "lucide-react";
import { searchResults } from "./FileSelector";

export const SimilarCodeFound = ({searchResults}: { searchResults: searchResults[] }) => {
  console.log(searchResults);
  
  return (
    <>
      <div className="my-4 p-4 w-full rounded-md border max-w-6xl">
        <h3 className="text-lg font-semibold mb-4">Similar Code Found:</h3>

        {searchResults && searchResults.length > 0 && searchResults.map((file, idx) => (
          <div key={idx} className="mb-4">
            <h4 className="font-medium">{file.orignalfilename}</h4>
              <Alert className="mt-2">
                <AlertTitle>{file.filename}</AlertTitle>
                <AlertDescription>
                  Found in repository:
                  <a
                    href={file.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline ml-1"
                  >
                    {file.repoUrl.split("/").slice(-2).join("/")}
                    <ExternalLink className="inline-block ml-1 h-4 w-4" />
                  </a>
                </AlertDescription>
              </Alert>
          </div>
        ))}
      </div>
    </>
  );
};
