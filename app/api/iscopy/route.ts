import { NextResponse } from "next/server";

const token = process.env.GITHUB_TOKEN;

export async function POST(req: Request) {
  try {
    const { commitMessage, username, repo } = await req.json();

    const headers = {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
    };

    const results = [];
    let totalfound: number = 0;

    const query = `"${commitMessage}" -repo:${username}/${repo}`;

    const searchUrl = `https://api.github.com/search/commits?q=${encodeURIComponent(
      query
    )}&page=1&per_page=5`;
    const searchResponse = await fetch(searchUrl, { headers });

    if (searchResponse.status === 200) {
      const searchData = await searchResponse.json();

      if (searchData.total_count > 0) {
        const data = searchData.items[0];

        totalfound++;
        results.push({
          commit: commitMessage,
          repoLink: `https://github.com/${data.repository.full_name}`,
        });
      }
    }

    return NextResponse.json({ totalfound, results });
  } catch (error) {
    return NextResponse.error();
  }
}
