import { NextResponse } from "next/server";

const token = process.env.GITHUB_TOKEN;

export async function POST(req: Request) {
  try {
    const { username, repo } = await req.json();

    const headers = {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
    };

    if (!username || !repo) {
      return NextResponse.error();
    }

    if (!token) {
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

      return NextResponse.json({ commitMessages });
    } else {
      return NextResponse.error();
    }
  } catch (error) {
    return NextResponse.error();
  }
}
