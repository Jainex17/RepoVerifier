import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  FileIcon,
  FolderIcon,
  Loader2,
  ChevronRight,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import { ignoredExtensions, ignoredFiles } from "./ignoredFiles.ts";
import { SimilarCodeFound } from "./SimilarCodeFound";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { redirect } from "next/navigation";

const fetchContents = async (owner: string, repo: string, path: string = '') => {
  const response = await fetch(`/api/github/contents?owner=${owner}&repo=${repo}&path=${encodeURIComponent(path)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch repository contents');
  }
  return response.json();
};

interface FileItem {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileItem[];
}

interface SearchResults {
  total_count: number;
  incomplete_results: boolean;
  items: Array<{
    name: string;
    path: string;
    html_url: string;
    repository: {
      id: number;
      name: string;
      full_name: string;
      html_url: string;
      owner: {
        login: string;
        avatar_url: string;
      };
    };
  }>;
}

interface FileSearchResults {
  filePath: string;
  results: SearchResults;
}

export default function FileSelector({
  owner,
  repo,
}: {
  owner: string;
  repo: string;
}) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchResultLoading, setSearchResultLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<FileSearchResults[]>([]);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const similarCodeRef = React.useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        if (!owner || !repo) {
          setError("Invalid owner or repository");
          setIsLoading(false);
          return;
        }

        const data = await fetchContents(owner, repo);
        if (Array.isArray(data)) {
          const fileTree = await buildFileTree(data, owner, repo);
          setFiles(fileTree);
        } else {
          setError("Unable to fetch repository contents");
        }
      } catch (err) {
        setError("Error fetching repository contents");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFiles();
  }, [owner, repo]);

  const buildFileTree = async (
    items: any[],
    owner: string,
    repo: string
  ): Promise<FileItem[]> => {
    try {
      const tree: FileItem[] = [];

      for (const item of items) {
        const fileExtension = item.name.split(".").pop();
        if (
          ignoredFiles.includes(item.name) ||
          (fileExtension && ignoredExtensions.includes(fileExtension))
        ) {
          continue;
        }

        const fileItem: FileItem = {
          name: item.name,
          path: item.path,
          type: item.type,
        };

        if (item.type === "dir") {
          const subItems = await fetchContents(owner, repo, item.path);
          if (Array.isArray(subItems)) {
            fileItem.children = await buildFileTree(subItems, owner, repo);
          }
        }

        tree.push(fileItem);
      }

      return tree;
    } catch (error) {
      console.error("Error building file tree:", error);
      toast({
        description: "Error building file tree",
        variant: "destructive",
      });
      redirect("/");
    }
  };

  const handleFileSelection = (path: string) => {
    if (searchResultLoading) {
      return;
    }

    setSelectedFiles((prev) => {
      if (prev.includes(path)) {
        return prev.filter((f) => f !== path);
      }  else {
        return [...prev, path];
      }
    });
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const renderFileTree = (
    items: FileItem[],
    depth: number = 0
  ): React.ReactNode => {
    return items.map((item) => (
      <div
        key={item.path}
        className={cn(
          "transition-all duration-200",
          depth === 0 ? "border-b border-zinc-900 last:border-none" : ""
        )}
      >
        <div
          className={cn(
            "flex items-center space-x-2 py-2 px-2 hover:bg-white/10 transition-colors",
            "cursor-pointer select-none",
          )}
          style={{ marginLeft: `${depth * 16}px` }}
          onClick={(e) => {
            if (item.type === "dir") {
              toggleFolder(item.path);
            }
          }}
        >
          {item.type === "dir" ? (
            <>
              {expandedFolders.has(item.path) ? (
                <ChevronDown className="h-4 w-4 text-zinc-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-zinc-400" />
              )}
              <FolderIcon className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-medium text-zinc-300">
                {item.name}
              </span>
              {item.children && (
                <Badge
                  variant="secondary"
                  className="ml-2 text-xs bg-zinc-800/50 text-zinc-300"
                >
                  {item.children.length} items
                </Badge>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center space-x-2 flex-1">
                <Checkbox
                  id={item.path}
                  checked={selectedFiles.includes(item.path)}
                  onCheckedChange={(checked) => {
                    handleFileSelection(item.path);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="data-[state=checked]:bg-indigo-600 border-zinc-700"
                />
                <FileIcon className="h-4 w-4 text-zinc-400" />
                <label
                  htmlFor={item.path}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleFileSelection(item.path);
                  }}
                  className="text-sm font-medium leading-none cursor-pointer text-zinc-300 hover:text-indigo-400 transition-colors"
                >
                  {item.name}
                </label>
              </div>
            </>
          )}
        </div>
        {item.children &&
          expandedFolders.has(item.path) &&
          renderFileTree(item.children, depth + 1)}
      </div>
    ));
  };

  const handleSubmit = () => {
    if (selectedFiles.length === 0) {
      console.log("Invalid number of files selected");
      return;
    }
    setSearchResults([]);
    searchForSimilarCode(selectedFiles);
  };

  const searchForSimilarCode = async (selectedFiles: string[]) => {
    try {
      setSearchResultLoading(true);
      const allResults: FileSearchResults[] = [];
      
      for (const file of selectedFiles) {
        try {
          const response = await fetch("/api/matchfilecontent", {
            method: "POST",
            body: JSON.stringify({
              filepath: file,
              owner,
              repo,
            }),
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data) {
              allResults.push({
                filePath: file,
                results: data
              });
            }
          } else {
            toast({
              description: "API Rate Limit Exceeded",
              variant: "destructive"
            });
            break;
          }
        } catch (err) {
          console.error(`Error scanning file ${file}:`, err);
        }
      }

      if (allResults.length > 0) {
        setSearchResults(allResults);
        setShowResultsModal(true);
      } else {
        toast({
          description: "No similar code found in any files",
        });
      }
    } catch (err) {
      console.error("Error while searching for similar code:", err);
      toast({
        description: "Error while searching for similar code",
        variant: "destructive",
      });
    } finally {
      setSearchResultLoading(false);
    }
  };

  const handleScanAllFiles = async () => {
    if (files.length === 0) {
      return;
    }

    setSearchResults([]);
    setSearchResultLoading(true);

    try {
      const allFiles = getAllFiles(files);
      const allResults: FileSearchResults[] = [];

      for (const file of allFiles) {
        try {
          const response = await fetch("/api/matchfilecontent", {
            method: "POST",
            body: JSON.stringify({
              filepath: file.path,
              owner,
              repo,
            }),
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data && data.total_count > 0) {
              allResults.push({
                filePath: file.path,
                results: data
              });
            }
          } else {
            toast({
              description: "API Rate Limit Exceeded",
              variant: "destructive"
            });
            break;
          }
        } catch (err) {
          console.error(`Error scanning file ${file.path}:`, err);
        }
      }

      if (allResults.length > 0) {
        setSearchResults(allResults);
        setShowResultsModal(true);
      } else {
        toast({
          description: "No similar code found in any files",
        });
      }
    } catch (err) {
      console.error("Error while scanning all files:", err);
      toast({
        description: "Error while scanning files",
        variant: "destructive",
      });
    } finally {
      setSearchResultLoading(false);
    }
  };

  const getAllFiles = (items: FileItem[]): FileItem[] => {
    let files: FileItem[] = [];
    
    for (const item of items) {
      if (item.type === "file") {
        files.push(item);
      } else if (item.type === "dir" && item.children) {
        files = files.concat(getAllFiles(item.children));
      }
    }
    
    return files;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] space-y-4 bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-zinc-300">Loading repository contents...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] space-y-4 bg-black">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-red-400 font-medium">{error}</p>
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          className="border-zinc-800 text-zinc-300 hover:bg-zinc-900"
        >
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl min-h-screen bg-black">
      <Card className="border-zinc-900 bg-zinc-950">
        <CardHeader className="space-y-4">
          <div className="flex flex-col space-y-2">
            <CardTitle className="text-2xl font-bold text-white">
              RepoVerifier
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Select unique files to scan for similar code in other repositories.
            </CardDescription>
            <div className="mt-2 text-xs text-zinc-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              <span>
                Common files (LICENSE, README) and non-code files (.txt, .png, .svg, etc.) are automatically excluded.
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <ScrollArea className="h-[400px] w-full rounded-lg border border-zinc-800 bg-black p-4">
            {files.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                <FolderIcon className="h-12 w-12 mb-2" />
                <p>No files found in repository</p>
              </div>
            ) : (
              renderFileTree(files)
            )}
          </ScrollArea>
        </CardContent>

        <Separator className="my-4 bg-zinc-800" />

        <CardFooter className="flex flex-col sm:flex-row gap-4 p-6">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="w-full sm:w-auto border-zinc-800 text-zinc-300 hover:bg-zinc-900"
          >
            Back
          </Button>
          <div className="flex-1 flex flex-col sm:flex-row gap-4">
            <Button
              variant="outline"
              className="w-full border-zinc-800 text-zinc-300 hover:bg-zinc-900"
              onClick={handleScanAllFiles}
              disabled={searchResultLoading || files.length === 0}
            >
              {searchResultLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                "Scan All Files"
              )}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={searchResultLoading || selectedFiles.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              {searchResultLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                `Scan ${selectedFiles.length} Selected Files`
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>

      {searchResults.length > 0 && showResultsModal && (
        <SimilarCodeFound
          searchResults={searchResults}
          onClose={() => setShowResultsModal(false)}
        />
      )}
    </div>
  );
}
