import React, { useRef, useEffect } from "react";
import { ExternalLink, FileCode, X } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Repository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

interface SearchItem {
  name: string;
  path: string;
  html_url: string;
  repository: Repository;
}

interface SearchResults {
  total_count: number;
  incomplete_results: boolean;
  items: SearchItem[];
}

interface FileSearchResults {
  filePath: string;
  results: SearchResults;
}

interface SimilarCodeFoundProps {
  searchResults: FileSearchResults[];
  onClose: () => void;
}

export const SimilarCodeFound = ({ searchResults, onClose }: SimilarCodeFoundProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  if (!searchResults || searchResults.length === 0) {
    return null;
  }

  const totalMatches = searchResults.reduce((total, file) => total + file.results.total_count, 0);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card ref={modalRef} className="border-zinc-900 bg-zinc-950 shadow-lg w-full max-w-3xl">
        <CardHeader className="space-y-2 sticky top-0 bg-zinc-950 border-b border-zinc-800 z-10 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileCode className="h-5 w-5 text-indigo-400" />
              <CardTitle className="text-xl font-semibold text-white">
                Similar Code Found
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-100"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <ScrollArea className="h-[calc(80vh-120px)]">
          <CardContent className="p-4">
            {searchResults.map((fileResult, fileIdx) => (
              <div key={fileIdx} className="mb-6 last:mb-0">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-medium text-zinc-100">{fileResult.filePath}</h3>
                  <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                    {fileResult.results.total_count}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {fileResult.results.items.map((item, idx) => (
                    <div key={idx} className="rounded-lg border border-zinc-800 bg-black p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img 
                            src={item.repository.owner.avatar_url} 
                            alt={item.repository.owner.login}
                            className="w-5 h-5 rounded-full"
                          />
                          <Link
                            href={item.repository.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 transition-colors text-sm inline-flex items-center group"
                          >
                            {item.repository.full_name}
                            <ExternalLink className="inline-block ml-1 h-3 w-3 opacity-70 group-hover:opacity-100" />
                          </Link>
                        </div>
                        <Link
                          href={item.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-zinc-400 hover:text-zinc-300 transition-colors text-xs inline-flex items-center group"
                        >
                          {item.path.split('/').pop()}
                          <ExternalLink className="inline-block ml-1 h-3 w-3 opacity-70 group-hover:opacity-100" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </ScrollArea>
      </Card>
    </div>
  );
};
