import { NextResponse } from "next/server";

const token = process.env.GITHUB_TOKEN;

interface FileItem {
  orignalfilename: string;
  filename: string;
  repoUrl: string;
}

export async function POST(req: Request) {
  try {
    const { filepaths, owner, repo } = await req.json();

    if (!filepaths || !owner || !repo || !token) {
      return NextResponse.error();
    }

    const headers = new Headers({
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
    });

    const matches: FileItem[] = []; 
    
    await traverseFilepaths(filepaths, owner, repo, headers, matches);

    return matches.length > 0 ? NextResponse.json(matches) : NextResponse.json({ match: false });
  } catch (error) {
    console.error("Error in POST handler:", error);
    return NextResponse.error();
  }
}

async function traverseFilepaths(
  filepaths: Array<any>,
  owner: string,
  repo: string,
  headers: Headers,
  matches: FileItem[]
) {
  for (const file of filepaths) {
    if (file.type === "dir" && file.children) {
      await traverseFilepaths(file.children, owner, repo, headers, matches);
    } else if (file.type === "file") {
      
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
        {
          headers,
        }
      );

      if (res.status === 200) {
        const data = await res.json();
        const content = Buffer.from(data.content, "base64").toString("utf-8");

        await ensureRateLimit(headers);

        const match = await searchCode(content, headers, owner, repo, file.path);
        
        if (match) matches.push(match);
      }
    }
  }
}

async function ensureRateLimit(headers: Headers) {
  while (true) {
    const { remaining, reset } = await checkSearchRateLimit(headers);
    if (remaining > 0) break;

    const delay = reset * 1000 - Date.now();
    console.log(`Rate limit exceeded. Waiting for ${delay / 1000} seconds...`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

async function checkSearchRateLimit(headers: Headers) {
  const rateLimitRes = await fetch("https://api.github.com/rate_limit", {
    headers,
  });

  if (rateLimitRes.status === 200) {
    const rateLimitData = await rateLimitRes.json();
    const searchLimits = rateLimitData.resources.search;
    return { remaining: searchLimits.remaining, reset: searchLimits.reset };
  } else {
    throw new Error("Failed to check rate limit");
  }
}

async function searchCode(
  content: string,
  headers: Headers,
  owner: string,
  repo: string,
  filepath: string
) {
  let keywords = content.replace(/[^a-zA-Z0-9<>{};]/g, " ");
  const cleanedKeywords = keywords.replace(/\s+/g, " ").trim();
  const searchTerms =
    cleanedKeywords.length > 800
      ? cleanedKeywords.slice(0, 800)
      : cleanedKeywords;

  const query = `${searchTerms} -repo:${owner}/${repo}`;

  const response = await fetch(
    `https://api.github.com/search/code?q=${encodeURIComponent(
      query
    )}&page=1&per_page=5`,
    {
      headers,
    }
  );

  if (response.status === 200) {
    const data = await response.json();
    
    if (data.total_count > 0 && filepath.localeCompare(data.items[0].path) == 0) {
      return {
        orignalfilename: filepath,
        filename: data.items[0].name,
        repoUrl: data.items[0].repository.html_url,
      };
    }
  }else{
    return null;
  }
}
