import React, { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExternalLink, FileCode } from "lucide-react";
import { searchResults } from "./FileSelector";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const SimilarCodeFound = ({
  searchResults,
}: {
  searchResults: searchResults[];
}) => {
  return (
    <Card className="border-zinc-800 bg-zinc-900 shadow-lg">
      <CardHeader className="space-y-2">
        <div className="flex items-center space-x-2">
          <FileCode className="h-5 w-5 text-indigo-400" />
          <CardTitle className="text-xl font-semibold text-zinc-50">
            Similar Code Found
          </CardTitle>
        </div>
        <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">
          {searchResults.length} {searchResults.length === 1 ? 'match' : 'matches'} found
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {searchResults.map((file, idx) => (
          <div key={idx} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
            <div className="mb-2">
              <h4 className="text-sm font-medium text-zinc-300">{file.filePath}</h4>
            </div>
            <Alert className="bg-zinc-900 border-zinc-800">
              <AlertTitle className="flex items-center space-x-2">
                <a
                  href={file.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 transition-colors flex items-center group"
                >
                  <span>{file.filename}</span>
                  <ExternalLink className="inline-block ml-1 h-4 w-4 opacity-70 group-hover:opacity-100" />
                </a>
              </AlertTitle>
              <AlertDescription className="text-zinc-400 mt-2">
                Found in repository:
                <Link
                  href={file.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 transition-colors ml-1 inline-flex items-center group"
                >
                  <span>{file.repoUrl.split("/").slice(-2).join("/")}</span>
                  <ExternalLink className="inline-block ml-1 h-4 w-4 opacity-70 group-hover:opacity-100" />
                </Link>
              </AlertDescription>
            </Alert>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
