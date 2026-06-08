//Fetches related papers from the Semantic Scholar API with one automatic retry on 429 rate-limit responses.

import { SS_BASE, SS_FIELDS, SS_LIMIT, SS_API_KEY } from "../config/config.js";
import { fetchWithTimeout, sleep } from "../utils/helpers.js";

/*
Search Semantic Scholar for papers related to `topic` and return a plain-text context string suitable for 
passing to an LLM prompt.

Returns `null` (never throws) so callers can degrade gracefully when Semantic Scholar is unavailable.
 * @param {string} topic
 * @returns {Promise<string|null>}
*/
export async function fetchPaperContext(topic) {
  const url = `${SS_BASE}/paper/search?query=${encodeURIComponent(topic)}&fields=${SS_FIELDS}&limit=${SS_LIMIT}`;

  const headers = { Accept: "application/json" };
  if (SS_API_KEY) headers["x-api-key"] = SS_API_KEY;

  let ssRes;

  try {
    ssRes = await fetchWithTimeout(url, { headers }, 8000);

    // 429 — wait Retry-After then retry once
    if (ssRes.status === 429) {
      const retryAfter = parseInt(ssRes.headers.get("Retry-After") || "5", 10);
      const waitMs     = Math.min((isNaN(retryAfter) ? 5 : retryAfter) * 1000, 10000);
      console.warn(`[semanticScholar] 429 — retrying in ${waitMs}ms`);
      await sleep(waitMs);
      ssRes = await fetchWithTimeout(url, { headers }, 8000);
    }
  } catch (err) {
    console.error("[semanticScholar] network error:", err.message);
    return null;
  }

  if (!ssRes.ok) {
    console.warn("[semanticScholar] returned", ssRes.status);
    return null;
  }

  let papers;
  try {
    const data = await ssRes.json();
    papers = (data.data || []).slice(0, SS_LIMIT);
  } catch (err) {
    console.error("[semanticScholar] JSON parse error:", err.message);
    return null;
  }

  if (!papers.length) return null;

  return papers
    .map((p, i) => {
      const year      = p.year             ? ` (${p.year})`                              : "";
      const citations = p.citationCount != null ? `, cited ${p.citationCount}x`          : "";
      const fields    = (p.fieldsOfStudy || []).length
                          ? ` [${p.fieldsOfStudy.join(", ")}]`
                          : "";
      const abstract  = p.abstract ? ` - ${p.abstract.slice(0, 140)}...` : "";
      return `${i + 1}. "${p.title}"${year}${citations}${fields}${abstract}`;
    })
    .join("\n");
}