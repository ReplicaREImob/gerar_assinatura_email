export const config = {
  api: {
    bodyParser: {
      sizeLimit: "5mb",
    },
  },
};

export default async function handler(req, res) {
  const allowedOrigin = "https://replicareimob.github.io";

  // 1️⃣ Set CORS headers first, always
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  res.setHeader("Access-Control-Max-Age", "86400"); // optional caching

  // 2️⃣ Handle preflight immediately
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 3️⃣ Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 4️⃣ Now your POST logic
  try {
    let body = req.body;

    if (!body || typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ error: "Invalid JSON" });
      }
    }

    const { filename, imageBase64 } = body;

    if (!filename || !imageBase64) {
      return res.status(400).json({ error: "Missing filename or image" });
    }

    const githubToken = process.env.GITHUB_TOKEN;
    const owner = process.env.REPO_OWNER;
    const repo = process.env.REPO_NAME;
    const path = `images/${filename}`;

    let sha;
    const getResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: { Authorization: `Bearer ${githubToken}` },
      }
    );
    if (getResponse.status === 200) {
      const data = await getResponse.json();
      sha = data.sha;
    }

    const putResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Upload image for ${filename}`,
          content: imageBase64,
          sha: sha,
        }),
      }
    );

    if (!putResponse.ok) {
      const text = await putResponse.text();
      return res.status(500).json({ error: text });
    }

    const url = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;
    return res.status(200).json({ success: true, url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
