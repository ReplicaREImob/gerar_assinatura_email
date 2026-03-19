export default async function handler(req, res) {
  // ✅ CORS headers (ALWAYS set first)
  const allowedOrigin = "https://replicareimob.github.io";

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  console.log("START");

 

  // ✅ Handle preflight FIRST and EXIT
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ❌ Only allow POST after this
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    let body = req.body;
    
    console.log("BODY:", body);
    console.log("REQ:", req);
    console.log("res:", res);
    console.log("USERNAME:", body.username);
    
    console.log("CALLING GITHUB GET...");
  
    console.log("ENV:", {
      token: !!process.env.GITHUB_TOKEN,
      owner: process.env.REPO_OWNER,
      repo: process.env.REPO_NAME
    });

    if (!body || typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ error: "Invalid JSON" });
      }
    }
    
    const username = body?.username;
    const imageBase64 = body?.imageBase64;
    
    if (!username || !imageBase64) {
      return res.status(400).json({ error: "Missing username or image" });
    }

    const githubToken = process.env.GITHUB_TOKEN;
    const owner = process.env.REPO_OWNER;
    const repo = process.env.REPO_NAME;
    const path = `images/${username}.png`;

    // Check if file exists
    let sha;
    const getResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: { Authorization: `Bearer ${githubToken}` },
    });

    if (getResponse.status === 200) {
      const data = await getResponse.json();
      sha = data.sha;
    }

    // Upload file
    const putResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        "Content-Type": "application/json",
      },
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

    const url = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;
    return res.status(200).json({ success: true, url });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
