import { DEEPSEEK_URL, DEEPSEEK_KEY, DEEPSEEK_MODEL } from "../config/config.js";
import { fetchWithTimeout } from "../utils/helpers.js";

export async function callDeepSeek({ systemPrompt, history = [], res, maxTokens = 1000, stream = true }) {
  
  const messages = [
    ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
    ...history,
  ];

  const fetchRes = await fetchWithTimeout(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${DEEPSEEK_KEY}`,
    },
    body: JSON.stringify({
      model:       DEEPSEEK_MODEL,
      temperature: 0.7,
      max_tokens:  maxTokens,
      stream,                
      messages,
    }),
  }, 15000);

  if (!fetchRes.ok) {
    const body = await fetchRes.text().catch(() => "");
    throw new Error(`DeepSeek ${fetchRes.status}: ${body.slice(0, 200)}`);
  }

  // Non-streaming path
  if (!stream) {
    const data = await fetchRes.json();
    return data.choices?.[0]?.message?.content || "";
  }

  // Streaming path
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  const reader  = fetchRes.body.getReader();
  const decoder = new TextDecoder();
  let   buffer  = "";
  let   full    = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const chunk = line.slice(6).trim();
      if (chunk === "[DONE]") continue;

      let parsed;
      try { parsed = JSON.parse(chunk); } catch { continue; }

      const token = parsed.choices?.[0]?.delta?.content;
      if (token) {
        full += token;
        send({ type: "token", content: token });
      }
    }
  }

  send({ type: "done", suggestions: [] });
  res.end();
  return full;
}