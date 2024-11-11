'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Octokit } from '@octokit/rest'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle2 } from "lucide-react"

const octokit = new Octokit()
const HACKATHON_START_DATE = new Date('2020-06-01T00:00:00Z')

interface VerificationResult {
  isOriginal: boolean
  message: string
}

export default function ProjectInput() {
  const [githubUrl, setGithubUrl] = useState('')
  const [verificationResult, setVerificationResult] = useState<VerificationResult>();
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const extractRepoInfo = (url: string) => {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/)
    return match ? { owner: match[1], repo: match[2] } : null
  }

  const verifyProject = async (e : React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setVerificationResult(undefined)

    const repoInfo = extractRepoInfo(githubUrl)
    if (!repoInfo) {
      setVerificationResult({ isOriginal: false, message: 'Invalid GitHub URL' })
      setIsLoading(false)
      return
    }

    try {
      const res = await octokit.repos.get({
        owner: repoInfo.owner,
        repo: repoInfo.repo,
      }).catch((error) => {
        if (error.status === 404) {
          setVerificationResult({ isOriginal: false, message: 'Repository not found' });
          setIsLoading(false);
        }
        if(error.status === 403) {
          setVerificationResult({ isOriginal: false, message: 'Rate limit exceeded' });
          setIsLoading(false);
        }
        return;
      });

      if (!res) {
        return;
      }

      const repoData = res.data;

      if(res.status !== 200) {
        setVerificationResult({ isOriginal: false, message: 'Error verifying project' })
        return;
      }

      const creationDate = new Date(repoData.created_at)
      const isCreatedAfterHackathonStart = creationDate > HACKATHON_START_DATE
      const isFork = repoData.fork

      const isOriginal = isCreatedAfterHackathonStart && !isFork

      setVerificationResult({
        isOriginal,
        message: isOriginal
          ? 'Project meet the basic requirements'
          : 'Project may Made before the hackathon or is a fork of another project',
      })

      if (isOriginal) {
        router.push(`/selectfiles?owner=${repoInfo.owner}&repo=${repoInfo.repo}`)
      }
    } catch (error: any) {
      setVerificationResult({
        isOriginal: false,
        message: 'Error verifying project',
      })
    }

    setIsLoading(false)
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className='text-2xl'>Duply Project Verifier</CardTitle>
        <CardDescription>Verify the originality of your GitHub project</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={verifyProject} className="space-y-4">
          <div className="space-y-2">
            <Label>GitHub Repository URL</Label>
            <Input
              id="githubUrl"
              type="url"
              placeholder="https://github.com/username/repo"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Verifying...' : 'Verify Project'}
          </Button>
        </form>
      </CardContent>
      {verificationResult && (
        <CardFooter>
          <div className="w-full space-y-2">
            <div className={`flex items-center gap-2 ${
              verificationResult.isOriginal ? 'text-green-600' : 'text-red-600'
            }`}>
              {verificationResult.isOriginal ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span className="font-semibold">{verificationResult.message}</span>
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  )
}