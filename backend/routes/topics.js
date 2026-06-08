import { Router } from "express";
import { callDeepSeek } from "../services/deepseek.js";
import { buildFallback } from "../utils/helpers.js";

const router = Router();

export const RESEARCH_SYSTEM = `
You are a research topic generator. 
You MUST respond with ONLY valid JSON — no explanation, no markdown, no code fences.
The JSON must have exactly these fields:
{
  "title": "A concise research topic title",
  "summary": "2-3 sentence overview of the topic",
  "researchQuestion": "A specific, answerable research question"
}
`;

router.post("/generate-topic", async (req, res) => {
  const { prompt } = req.body || {};

  if (!prompt?.trim()) {
    return res.status(400).json({ error: "prompt is required." });
  }

  try {
    const result = await callDeepSeek({
      systemPrompt: RESEARCH_SYSTEM,
      history:      [{ role: "user", content: prompt }],
      maxTokens:    1024,
      stream:       false,   // plain JSON response
    });
    let parsed;
    try {
      const clean = result.replace(/```json|```/g, "").trim();  // strip code fences
      parsed = JSON.parse(clean);
    } catch {
      return res.status(502).json({ error: "AI returned malformed JSON." });
    }
    return res.json(parsed);  
  } catch (err) {
    console.error("[generate-topic]", err.message);
    return res.status(502).json({ error: err.message });
  }
});


router.post("/refine-topic", async (req, res) => {
  const { topic, paperContext } = req.body || {};

  if (!topic?.trim()) {
    return res.status(400).json({ error: "topic is required." });
  }
  if (topic.length > 500) {
    return res.status(400).json({ error: "topic must be 500 characters or fewer." });
  }

  const contextSection = paperContext?.trim()
    ? `\n\nRecent related papers for context:\n${paperContext.slice(0, 3000)}`
    : "";

  const userPrompt = `A student submitted this broad research topic:
"${topic.trim()}"${contextSection}

Return ONLY valid JSON with exactly these keys:
{
  "refined": "<a precise, narrow, researchable thesis-level topic — 1 sentence>",
  "variations": ["<alternative angle 1>", "<alternative angle 2>", "<alternative angle 3>"]
}

Rules:
- refined must be more specific than the input (add population, time period, context, or mechanism)
- each variation should take a genuinely different angle from the others`;

  try {
    const result = await callDeepSeek({
      userPrompt,
      maxTokens: 700,
    });

    if (!result.refined || !Array.isArray(result.variations)) {
      return res.status(502).json({ error: "AI response was incomplete. Please retry." });
    }

    result.variations = result.variations.slice(0, 3);
    return res.json(result);
  } catch (err) {
    console.error("[refine-topic]", err.message);
    return res.status(502).json({ error: err.message });
  }
});

router.post("/lit-review", async (req, res) => {
  const { topic, doi, options } = req.body || {};

  if (!topic?.trim()) {
    return res.status(400).json({ error: "Research topic is required." });
  }

  const selectedOpts = Object.entries(options || {})
    .filter(([, value]) => value)
    .map(([key]) => key)
    .join(", ");

  const userPrompt = `
You are an expert research librarian and academic analyst.
Generate a comprehensive structured literature review analysis.

Topic: "${topic}"
${doi ? `DOI/URL context: ${doi}` : ""}
Output preferences: ${selectedOpts || "none specified"}

Respond with ONLY valid JSON using this exact structure:
{
  "topicTitle": "clean title",
  "paperCount": 20,
  "summary": "overview paragraph",
  "themes": [{ "label": string, "pct": number, "color": string }],
  "gaps": [{ "severity": string, "text": string }],
  "methods": [{ "label": string, "count": number, "color": string }],
  "papers": [{ "rank": number, "title": string, "authors": string, "year": number, "venue": string, "score": number, "tag": string, "researchQuestion": string, "methodology": string, "keyFinding": string, "limitation": string, "aiNote": string, "relevance": { "topicAlignment": number, "methodFit": number, "recency": number, "citationWeight": number, "gapRelevance": number } }],
  "conflicts": [{ "claim1": string, "source1": string, "claim2": string, "source2": string }],
  "futureDirections": [string]
}

Requirements:
- papers array should contain 5–6 entries with realistic titles and venues
- theme percentages must be in descending order
- include concrete findings, not placeholders`.trim();

  try {
    const result = await callDeepSeek({
      userPrompt,
      maxTokens: 1200,
    });
    return res.json(result);
  } catch (err) {
    console.error("[lit-review] AI failed, using fallback:", err.message);
    return res.json(buildFallback(topic));
  }
});

export default router;