import { NextResponse } from "next/server";

const token = process.env.GITHUB_TOKEN;

export async function POST(req: Request) {
  try {
    const { filepath, owner, repo } = await req.json();

    if (!filepath || !owner || !repo) {
      return NextResponse.error();
    }

    if (!token) {
      return NextResponse.error();
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
        const data = await response.json();
                
        if (data.total_count > 0) {
          const OrignalFileName = filepath.split("/").pop();
          
          if(OrignalFileName.localeCompare(data.items[0].name) != 0){
            return NextResponse.json({ match: false });
          }
          
          const repoLink = data.items[0].repository.html_url;
          const fileLink = data.items[0].html_url;
          const safeUrl = fileLink.replace(/\[/g, '%5B').replace(/\]/g, '%5D');
         
          return NextResponse.json({
            match: true,
            fileUrl: safeUrl,
            fileName: data.items[0].name,
            repoLink: repoLink,
          });
        } else {
          return NextResponse.json({ match: false });
        }
      } else {
        console.log("error while searching for file content");
        return NextResponse.error();
      }
    } else {
      console.log("error while fetching file content");
      return NextResponse.error();
    }
  } catch (error) {
    return NextResponse.error();
  }
}
