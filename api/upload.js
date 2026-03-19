import { Buffer } from "buffer";
import fetch from "node-fetch";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "5mb", // adjust based on image size
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { username, imageBase64 } = req.body;

    if (!username || !imageBase64) {
      return res.status(400).json({ error: "Missing username or image" });
    }

    const githubToken = process.env.GITHUB_TOKEN;
    const owner = process.env.REPO_OWNER;
    const repo = process.env.REPO_NAME;
    const path = `images/${username}.png`;

    // 1️⃣ Check if file exists
    let sha;
    const getResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: { Authorization: `Bearer ${githubToken}` },
    });

    if (getResponse.status === 200) {
      const data = await getResponse.json();
      sha = data.sha; // overwrite existing file
    }

    // 2️⃣ Upload file
    const putResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${githubToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Upload image for ${username}`,
        content: imageBase64,
        sha: sha,
      }),
    });

    if (!putResponse.ok) {
      const text = await putResponse.text();
      return res.status(500).json({ error: text });
    }

    // 3️⃣ Return public URL
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;
    res.status(200).json({ success: true, url });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}
