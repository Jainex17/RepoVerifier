import React, { useState, useEffect } from "react";
import { Octokit } from "@octokit/rest";
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
import { FileIcon, FolderIcon, Loader2, ChevronRight, ChevronDown, AlertCircle } from "lucide-react";
import { ignoredExtensions, ignoredFiles } from "./ignoredFiles.ts";
import { SimilarCodeFound } from "./SimilarCodeFound";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const octokit = new Octokit();

interface FileItem {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileItem[];
}

export interface searchResults {
  filePath: string;
  fileUrl: string;
  filename: string;
  repoUrl: string;
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
  const [searchResults, setSearchResults] = useState<searchResults[]>();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const { toast } = useToast();

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        if (!owner || !repo) {
          setError("Invalid owner or repository");
          setIsLoading(false);
          return;
        }

        const response = await octokit.repos.getContent({
          owner,
          repo,
          path: "",
        });

        if (Array.isArray(response.data)) {
          const fileTree = await buildFileTree(response.data, owner, repo);

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
    const tree: FileItem[] = [];

    for (const item of items) {
      const fileExtension = item.name.split(".").pop();
      if (
        ignoredFiles.includes(item.name) ||
        ignoredExtensions.includes(fileExtension)
      ) {
        continue;
      }

      const fileItem: FileItem = {
        name: item.name,
        path: item.path,
        type: item.type,
      };

      if (item.type === "dir") {
        const subItems = await octokit.repos.getContent({
          owner,
          repo,
          path: item.path,
        });

        if (Array.isArray(subItems.data)) {
          fileItem.children = await buildFileTree(subItems.data, owner, repo);
        }
      }

      tree.push(fileItem);
    }

    return tree;
  };

  const handleFileSelection = (path: string) => {
    if(searchResultLoading){
      return;
    }
    
    setSelectedFiles((prev) => {
      if (prev.includes(path)) {
        return prev.filter((f) => f !== path);
      } else if (prev.length < 5) {
        return [...prev, path];
      } else {
        return prev;
      }
    });
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
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
      <div key={item.path} 
           className={cn(
             "transition-all duration-200",
             depth === 0 ? "border-b border-zinc-800 last:border-none" : ""
           )}>
        <div 
          className={cn(
            "flex items-center space-x-2 py-2 px-2 hover:bg-zinc-800/50 rounded-md transition-colors",
            "cursor-pointer select-none",
            selectedFiles.includes(item.path) && item.type === "file" ? "bg-zinc-800" : ""
          )}
          style={{ marginLeft: `${depth * 16}px` }}
          onClick={() => item.type === "dir" ? toggleFolder(item.path) : handleFileSelection(item.path)}>
          {item.type === "dir" ? (
            <>
              {expandedFolders.has(item.path) ? 
                <ChevronDown className="h-4 w-4 text-zinc-400" /> :
                <ChevronRight className="h-4 w-4 text-zinc-400" />
              }
              <FolderIcon className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-medium text-zinc-300">{item.name}</span>
              {item.children && (
                <Badge variant="secondary" className="ml-2 text-xs bg-zinc-800/50 text-zinc-300">
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
                  onCheckedChange={() => handleFileSelection(item.path)}
                  className="data-[state=checked]:bg-indigo-600 border-zinc-700"
                />
                <FileIcon className="h-4 w-4 text-zinc-400" />
                <label
                  htmlFor={item.path}
                  className="text-sm font-medium leading-none cursor-pointer text-zinc-300 hover:text-indigo-400 transition-colors"
                >
                  {item.name}
                </label>
              </div>
            </>
          )}
        </div>
        {item.children && expandedFolders.has(item.path) && renderFileTree(item.children, depth + 1)}
      </div>
    ));
  };

  const handleSubmit = () => {
    if (selectedFiles.length === 0 || selectedFiles.length > 5) {
      console.log("Invalid number of files selected");
      return;
    }
    setSearchResults([]);
    searchForSimilarCode(selectedFiles);
  };

  const searchForSimilarCode = async (selectedFiles: string[]) => {
    setSearchResultLoading(true);
    const searchResults: searchResults[] = [];
    for (const file of selectedFiles) {
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
        if (data.match) {
          searchResults.push({
            filePath: file,
            fileUrl: data.fileUrl,
            filename: data.fileName,
            repoUrl: data.repoLink,
          });
        }
      } else {
        toast({
          description: "API Rate Limit Exceeded",
        });
      }
    }

    setSearchResults(searchResults);
    setSearchResultLoading(false);
  };

  const handleScanAllFiles = async () => {

    if(files.length === 0){
      return;
    }

    setSearchResults([]);
    setSearchResultLoading(true);

    try{
      const res = await fetch("/api/matchallfilecontent", {
        method: "POST",
        body: JSON.stringify({
          filepaths: files,
          owner,
          repo,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      const data = await res.json();
      setSearchResults(data);
    }catch(err){
      setSearchResults([]);
      console.error("error while scanning all files");
    }finally{
      setSearchResultLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] space-y-4 bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-zinc-400">Loading repository contents...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-[70vh] space-y-4 bg-zinc-950">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-red-400 font-medium">{error}</p>
        <Button variant="outline" onClick={() => window.history.back()} className="border-zinc-800 text-zinc-300 hover:bg-zinc-800/50">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl bg-zinc-950 min-h-screen">
      <Card className="shadow-lg border-zinc-800 bg-zinc-900">
        <CardHeader className="space-y-4">
          <div className="flex flex-col space-y-2">
            <CardTitle className="text-2xl font-bold text-zinc-50">
              Repository Scanner
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Select up to 5 files to check for code duplication across repositories
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Progress 
              value={(selectedFiles.length / 5) * 100} 
              className="h-2 bg-zinc-800"
            />
            <span className="text-sm text-zinc-400">
              {selectedFiles.length}/5 files selected
            </span>
          </div>
        </CardHeader>

        <CardContent>
          <ScrollArea className="h-[400px] w-full rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
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
            className="w-full sm:w-auto border-zinc-800 text-zinc-300 hover:bg-zinc-800/50 hover:text-zinc-50"
          >
            Back
          </Button>
          <div className="flex-1 flex flex-col sm:flex-row gap-4">
            <Button
              variant="outline"
              className="w-full border-zinc-800 text-zinc-300 hover:bg-zinc-800/50 hover:text-zinc-50"
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
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-zinc-50 disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              {searchResultLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                `Scan ${selectedFiles.length} Selected File${selectedFiles.length !== 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>

      <div className="mt-8">
        {searchResultLoading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-zinc-400">Searching for similar code...</p>
          </div>
        )}
        
        {!searchResultLoading && searchResults && searchResults.length === 0 && (
          <Card className="bg-zinc-900 border-zinc-800 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileIcon className="h-12 w-12 text-zinc-600 mb-4" />
              <p className="text-zinc-400 text-center">No similar code found in other repositories</p>
            </CardContent>
          </Card>
        )}

        {searchResults && searchResults.length > 0 && (
          <SimilarCodeFound searchResults={searchResults} />
        )}
      </div>
    </div>
  );
}
