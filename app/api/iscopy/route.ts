import { NextResponse } from "next/server";

const token = process.env.GITHUB_TOKEN;

export async function POST(req: Request) {
  try {
    const { username, repo } = await req.json();

    const headers = {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
    };

    if(!username || !repo) {
      return NextResponse.error();
    }

    if(!token) {
      return NextResponse.error();
    }

    let page = 1;
    const commitMessages: string[] = [];

    const url = `https://api.github.com/repos/${username}/${repo}/commits?page=${page}&per_page=100`;
    const response = await fetch(url, { headers });

    if (response.status === 200) {
      const data = await response.json();

      for (let i = 0; i < data.length; i++) {
        commitMessages.push(data[i].commit.message);
      }

      const results = [];
      let totalfound: number = 0;

      for (let i = 0; i < commitMessages.length; i++) {
        const commitMessage = commitMessages[i];
        const query = `"${commitMessage}" -repo:${username}/${repo}`;

        const searchUrl = `https://api.github.com/search/commits?q=${encodeURIComponent(
          query
        )}&page=${page}&per_page=5`;
        const searchResponse = await fetch(searchUrl, { headers });

        if (searchResponse.status === 200) {
          const searchData = await searchResponse.json();

          if (searchData.total_count > 0) {
            const data = searchData.items[0];
            
            totalfound++;
            results.push({
              commit: commitMessages[i],
              repoLink: `https://github.com/${data.repository.full_name}`,
            });
          } 
        //   else {
        //     results.push({
        //       commit: commitMessages[i],
        //       repoLink: null,
        //     });
        //   }
        } 
        // else {
        //   results.push({
        //     commit: commitMessages[i],
        //     repoLink: null,
        //   });
        // }
      }
      const score = Math.round(totalfound / commitMessages.length * 100) + "% similarity found";
      return NextResponse.json({ score, results });
    } else {
      return NextResponse.error();
    }
  } catch (error) {
    return NextResponse.error();
  }
}
