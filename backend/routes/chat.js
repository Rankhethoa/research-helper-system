import { Router } from "express";
import { callDeepSeek } from "../services/deepseek.js";
import { LUMI_SYSTEM } from "../prompts/lumi.js";

const router = Router();

// in-memory session store: sessionId => [{ role: "user"|"assistant", content: string }, ...]
const sessions = new Map();

router.post("/session", (_req, res) => {
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  sessions.set(sessionId, []);
  res.json({ sessionId });
});

router.post("/message", async (req, res) => {
  const { sessionId, message } = req.body || {};

  if (!sessionId || !message?.trim()) {
    return res.status(400).json({ error: "sessionId and message are required." });
  }

  if (!sessions.has(sessionId)) sessions.set(sessionId, []);

  const history = sessions.get(sessionId).filter(
    m => m && typeof m.content === "string" && m.content.trim().length > 0
  );
  sessions.set(sessionId, history);

  history.push({ role: "user", content: message.trim() });

  try {
    const fullText = await callDeepSeek({
      systemPrompt: LUMI_SYSTEM,
      history,   // pass history, not userPrompt
      res,
    });

    if (fullText && fullText.trim().length > 0) {
      history.push({ role: "assistant", content: fullText });
    }
  } catch (err) {
    console.error("[chat/message]", err.message);
    if (!res.headersSent) {
      return res.status(502).json({ error: err.message });
    }
  }
});

router.post("/clear", (req, res) => {
  const { sessionId } = req.body || {};
  if (sessionId && sessions.has(sessionId)) sessions.set(sessionId, []);
  res.json({ ok: true });
});

export default router;