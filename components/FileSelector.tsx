import React, { useState, useEffect } from 'react'
import { Octokit } from '@octokit/rest'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { FileIcon, FolderIcon, Loader2 } from "lucide-react"
import { ignoredExtensions, ignoredFiles } from './ignoredFiles'
import { SimilarCodeFound } from './SimilarCodeFound'

const octokit = new Octokit()

interface FileItem {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: FileItem[]
}

export default function FileSelector({ owner, repo }: { owner: string, repo: string }) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        if(!owner || !repo) {
          setError('Invalid owner or repository')
          setIsLoading(false)
          return
        }

        const response = await octokit.repos.getContent({
          owner,
          repo,
          path: '', 
        })

        if (Array.isArray(response.data)) {
          const fileTree = await buildFileTree(response.data, owner, repo)
          
          setFiles(fileTree)
        } else {
          setError('Unable to fetch repository contents')
        }
      } catch (err) {
        setError('Error fetching repository contents')

      } finally {
        setIsLoading(false)
      }
    }

    fetchFiles()
  }, [owner, repo])

  const buildFileTree = async (items: any[], owner: string, repo: string): Promise<FileItem[]> => {
    const tree: FileItem[] = []

    for (const item of items) {
        const fileExtension = item.name.split('.').pop();
        if(ignoredFiles.includes(item.name) || ignoredExtensions.includes(fileExtension)) {
            continue;
        }

      const fileItem: FileItem = {
        name: item.name,
        path: item.path,
        type: item.type,
      }

      if (item.type === 'dir') {
        const subItems = await octokit.repos.getContent({
          owner,
          repo,
          path: item.path,
        })

        if (Array.isArray(subItems.data)) {
          fileItem.children = await buildFileTree(subItems.data, owner, repo)
        }
      }

      tree.push(fileItem)
    }

    return tree
  }

  const handleFileSelection = (path: string) => {
    setSelectedFiles(prev => {
      if (prev.includes(path)) {
        return prev.filter(f => f !== path)
      } else if (prev.length < 5) {
        return [...prev, path]
      } else {
        return prev
      }
    })
  }

  const renderFileTree = (items: FileItem[], depth: number = 0): React.ReactNode => {
    return items.map((item) => (
      <div key={item.path} style={{ paddingLeft: `${depth * 10}px` }}>
        <div className="flex items-center space-x-2 py-1">
          {item.type === 'dir' ? (
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
          <label htmlFor={item.path} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {item.name}
          </label>
        </div>
        {item.children && renderFileTree(item.children, depth + 1)}
      </div>
    ))
  }

  const handleSubmit = () => {
    console.log('Selected files:', selectedFiles)
    // Implement submission logic here
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Select files to check for duplication from other repositories.</CardTitle>
        <CardDescription>Select up to 5 unique files to check.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] w-full rounded-md border p-4">
          {renderFileTree(files)}
        </ScrollArea>
      </CardContent>
      {/* <Separator /> */}
      <SimilarCodeFound />
      <CardFooter className="flex justify-between items-center py-4">
        <Button variant="outline" onClick={() => window.history.back()}>Cancel</Button>
        <Button onClick={handleSubmit}>Submit Selected Files</Button>
      </CardFooter>

    </Card>
  )
}
