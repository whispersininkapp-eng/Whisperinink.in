import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: AI Writing Assistant
  app.post("/api/ai/prompt", async (req, res) => {
    const { mood } = req.body;
    if (!mood) {
      return res.status(400).json({ error: "Mood is required" });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate exactly 3 raw, highly creative writing prompts or prose starters for someone feeling ${mood}. 
        The tone must be deeply literary, psychologically intense, and existential—inspired by masters like Fyodor Dostoevsky.
        Avoid obvious AI cliches, sterile phrases, and words like "tapestry", "embark", "crucible", "testament", "symphony", "delve". 
        Focus on concrete human raw realities: cold rooms, silent clocks, stained letters, the cost of a guilty conscience, or small spaces. 
        Format as a JSON array of strings containing only the prompts directly.`,
        config: {
          responseMimeType: "application/json"
        }
      });

      const prompts = JSON.parse(response.text || "[]");
      res.json({ prompts });
    } catch (error) {
      console.error("AI Assistant Error:", error);
      res.status(500).json({ error: "Failed to generate prompts" });
    }
  });

  // API Route: AI Content Moderation
  app.post("/api/ai/moderate", async (req, res) => {
    const { title, content } = req.body;
    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze the following title and content for a creative writing platform. 
        Determine if it violates safety policies: hate speech, harassment, sexually explicit material, or extreme violence.
        Also analyze the sentiment to ensure it aligns with the platform's emotional/artistic tone.

        Title: ${title || 'No Title'}
        Content: ${content}

        Return ONLY a JSON object:
        {
          "isSafe": boolean,
          "reason": "explanation if not safe, otherwise null",
          "flaggedCategory": "hate_speech" | "harassment" | "explicit" | "violence" | null,
          "sentiment": "string"
        }`,
        config: {
          responseMimeType: "application/json"
        }
      });

      const moderation = JSON.parse(response.text || "{}");
      res.json(moderation);
    } catch (error) {
      console.error("AI Moderation Error:", error);
      res.status(500).json({ error: "Failed to moderate content" });
    }
  });

  // Serve robots.txt explicitly
  app.get("/robots.txt", (req, res) => {
    res.type("text/plain");
    res.send("User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: https://whispers.dev/sitemap.xml\n");
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
