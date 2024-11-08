"use client";

import { useState } from "react";

interface Result {
  commit: string;
  repoLink: string;
}

interface Analysis {
  score: string;
  results: Result[];
}

export default function Home() {
  const [analysis, setAnalysis] = useState<Analysis>();
  const [repoLink, setRepoLink] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  
  async function handlesubmit(e: any) {
    e.preventDefault();
    if (!repoLink) return;

    if (repoLink.split("/").length != 5) {
      alert("Invalid repository link");
      return;
    }

    if (!repoLink.includes("github.com")) {
      alert("Invalid repository link");
      return;
    }

    setLoading(true);

    const username = repoLink.split("/")[3];
    const repo = repoLink.split("/")[4];

    console.log(username, repo);

    const res = await fetch("/api/getrepocontent", {
      method: "POST",
      body: JSON.stringify({ username, repo }),
    });

    if (res.status == 200) {
      const data = await res.json();
      console.log(data);
    }

    setLoading(false);
  }

  return (
    <>
      <div className="flex justify-center items-center flex-col">
        <h1 className="mt-20 text-4xl font-bold">DUPLY</h1>

        <form className="flex flex-col mt-20 gap-5" onSubmit={handlesubmit}>
          <input
            type="text"
            placeholder="Enter github repository url"
            className="border-2 border-gray-500 rounded-md p-2 bg-black w-96"
            value={repoLink}
            onChange={(e) => setRepoLink(e.target.value)}
          />
          <button
            type="submit"
            className="bg-blue-500 text-white rounded-md p-2"
          >
            check duplication
          </button>
        </form>

        {loading && (
          <div role="status">
            <svg
              aria-hidden="true"
              className="my-20 w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
              viewBox="0 0 100 101"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                fill="currentColor"
              />
              <path
                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                fill="currentFill"
              />
            </svg>
            <span className="sr-only">Loading...</span>
          </div>
        )}

        {analysis && (
          <div className="mt-10 mx-32">
            <p>Score: {analysis.score}</p>

            <h1 className="text-2xl font-bold mt-5">Smilar Commits</h1>
            <p className="mb-5 text-gray-400 text-sm">
              please ignore common commits like initial commit, update readme
              etc
            </p>

            {analysis.results && (
              <div className="gap-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 my-5">
                {analysis.results.map((result, idx) => (
                  <div
                    className="border-2 border-gray-500 p-5 rounded-md"
                    key={idx}
                  >
                    <p>Commit: {result.commit}</p>
                    <a
                      href={result.repoLink}
                      className="text-blue-500"
                      target="_blank"
                    >
                      Repository Link
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
