/*
Proxies Semantic Scholar on behalf of the browser (avoids CORS + 429s).
Returns: { context: string | null, warning?: string }
*/

import { Router } from "express";
import { fetchPaperContext } from "../services/semanticScholar.js";

const router = Router();

router.get("/papers", async (req, res) => {
  const topic = (req.query.topic || "").trim();

  if (!topic) {
    return res.status(400).json({ error: "topic query param is required." });
  }

  const context = await fetchPaperContext(topic);

  if (context === null) {
    return res.json({
      context: null,
      warning: "Could not reach Semantic Scholar — continuing without paper context.",
    });
  }

  return res.json({ context });
});

export default router;