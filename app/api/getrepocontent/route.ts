import { NextResponse } from "next/server";
import { commonFiles, commonFolders } from "./commonName.types";

const token = process.env.GITHUB_TOKEN;
const allFiles: string[] = [];

export async function POST(req: Request) {
  try {
    const { username, repo } = await req.json();
    

    if (!username || !repo) {
      return NextResponse.error();
    }

    if (!token) {
      return NextResponse.error();
    }

    const headers = {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
    };

    const url = `https://api.github.com/repos/${username}/${repo}/contents`;
    const response = await fetch(url, { headers });

    if (response.status === 200) {
      const data = await response.json();

      for (let i = 0; i < data.length; i++) {

        if (data[i].type === 'dir') {
          if(commonFolders.includes(data[i].name)) continue;
          await getFilesInDirectory(data[i].path, username, repo);
        }else{
          if(commonFiles.includes(data[i].name)) continue;

          allFiles.push(data[i].path);
        }

      }

      return NextResponse.json({ allFiles });
    } else {
      return NextResponse.error();
    }
  } catch (error) {
    return NextResponse.error();
  }
}

async function getFilesInDirectory(dirPath: string, owner: string, repo: string) {
  try {
    const headers = {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
    };

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${dirPath}`,
      { headers }
    );

    if (response.status !== 200) {
      console.error(`Error fetching directory ${dirPath}:`, response.statusText);
      return;
    }

    const data = await response.json();

    for (const item of data) {
      if (item.type === 'file') {
        if(commonFiles.includes(item.name)) continue;
        
        allFiles.push(item.path);
      } else if (item.type === 'dir') {
        if(commonFolders.includes(item.name)) continue;

        await getFilesInDirectory(item.path, owner, repo);
      }
    }
  } catch (error) {
    console.error(`Error fetching directory ${dirPath}:`, error);
  }
}