import { NextResponse } from "next/server";

const token = process.env.GITHUB_TOKEN1;

export async function POST(req: Request) {
  try {
    const { filepath, owner, repo } = await req.json();

    if (!filepath || !owner || !repo) {
      return NextResponse.json(
        { error: "Missing filepath, owner, or repo" },
        { status: 400 }
      );
    }

    if (!token) {
      return NextResponse.json(
        { error: "Missing GitHub token" },
        { status: 500 }
      );
    }

    const headers = {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
    };

    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filepath}`,
      {
        headers,
      }
    );
    
    if (res.status === 200) {
      const data = await res.json();
      const content = Buffer.from(data.content, "base64").toString("utf-8");

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
        const searchData = await response.json();
                
        if (searchData.total_count > 0) {
          const originalFileName = filepath.split("/").pop();
          
          // Filter results to only include exact file name matches
          const matchingItems = searchData.items.filter(
            (item: any) => item.name === originalFileName
          );

          if (matchingItems.length === 0) {
            return NextResponse.json({
              total_count: 0,
              incomplete_results: false,
              items: []
            });
          }
          
          return NextResponse.json({
            total_count: matchingItems.length,
            incomplete_results: searchData.incomplete_results,
            items: matchingItems
          });
        } else {
          return NextResponse.json({
            total_count: 0,
            incomplete_results: false,
            items: []
          });
        }
      } else {
        return NextResponse.json(
          { error: "Error while searching for file content" },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Error while fetching file content" },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Error while processing request" },
      { status: 500 }
    );
  }
}
