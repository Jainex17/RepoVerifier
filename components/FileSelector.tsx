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
import { FileIcon, FolderIcon, Loader2 } from "lucide-react";
import { ignoredExtensions, ignoredFiles } from "./ignoredFiles.ts";
import { SimilarCodeFound } from "./SimilarCodeFound";
import { useToast } from "@/hooks/use-toast";

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

  const renderFileTree = (
    items: FileItem[],
    depth: number = 0
  ): React.ReactNode => {
    return items.map((item) => (
      <div key={item.path} style={{ paddingLeft: `${depth * 10}px` }}>
        <div className="flex items-center space-x-2 py-1">
          {item.type === "dir" ? (
            <FolderIcon className="h-4 w-4 text-blue-500" />
          ) : (
            <>
              <Checkbox
                id={item.path}
                checked={selectedFiles.includes(item.path)}
                onCheckedChange={() => handleFileSelection(item.path)}
              />
              <FileIcon className="h-4 w-4 text-gray-500" />
            </>
          )}
          <label
            htmlFor={item.path}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {item.name}
          </label>
        </div>
        {item.children && renderFileTree(item.children, depth + 1)}
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
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-around items-center w-full flex-col my-8">
        <Card>
          <CardHeader>
            <CardTitle>
              Select files to check for duplication from other repositories.
            </CardTitle>
            <CardDescription>
              Select up to 5 unique files to check.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] w-full rounded-md border p-4">
              {renderFileTree(files)}
            </ScrollArea>
          </CardContent>
          <Separator />

          <CardFooter className="flex justify-between items-center flex-col sm:flex-row py-4 gap-4">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="w-full"
            >
              Back
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleScanAllFiles}
              disabled={searchResultLoading}
            >
              Scan All Files (Slow)
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={searchResultLoading}
              className="w-full"
            >
              {searchResultLoading ? "Searching..." : "Submit Selected Files"}
            </Button>
          </CardFooter>
        </Card>

        {searchResultLoading && (
          <div className="flex justify-center items-center h-24">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}
        
        {!searchResultLoading && searchResults && searchResults.length === 0 && (
          <div className="flex justify-center items-center h-24">
            <p className="text-gray-500">No similar code found</p>
            </div>
            )}

        {searchResults && searchResults.length > 0 && (
          <SimilarCodeFound searchResults={searchResults} />
        )}
      </div>
    </>
  );
}
