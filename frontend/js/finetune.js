/*
Flow:
1. Fetch related papers from Semantic Scholar API (free, no key needed)
2. POST to /api/refine-topic (your server proxy) — the server holds the
    DeepSeek API key in .env; the key never touches the browser
3. If either step fails → fall back to a deterministic rule-based engine
*/

// Configuration
const CONFIG = {
  server: {
    refineEndpoint: "/api/refine-topic",   // POST: topic → refined result (calls DeepSeek)
    papersEndpoint: "/api/papers",         // GET:  ?topic=… → Semantic Scholar papers
    timeoutMs: 20000,
  },
  history: {
    maxItems: 6,
    storageKey: "topicRefinerHistory",
  },
};

// State
let isLoading = false;

async function refineTopic() {
  const rawTopic = document.getElementById("subfield").value.trim();

  if (!rawTopic) {
    showError("Please enter a research topic before continuing.");
    return;
  }

  if (isLoading) return;
  startLoading();

  try {
    // Step 1 – Semantic Scholar context 
    setStatus("Consulting the literature…");
    const paperContext = await fetchSemanticScholarContext(rawTopic);

    // Step 2 – DeepSeek refinement
    setStatus("Asking the AI to refine your topic…");
    const result = await refineWithDeepSeek(rawTopic, paperContext);

    renderResult(result, rawTopic);
    saveHistory(rawTopic, result.refined);
  } catch (err) {
    console.warn("API pipeline failed, using rule-based fallback:", err.message);

    // Step 3 – Rule-based fallback 
    setStatus("Fine-tuning with built-in logic…");
    await artificialDelay(900);
    const result = ruleBasedRefine(rawTopic);

    renderResult(result, rawTopic);
    saveHistory(rawTopic, result.refined);
  } finally {
    stopLoading();
  }
}

/* 
SEMANTIC SCHOLAR  (via server proxy)
The browser never calls semanticscholar.org directly — avoids CORS blocks and 429s.
*/

async function fetchSemanticScholarContext(topic) {
  const url = `${CONFIG.server.papersEndpoint}?topic=${encodeURIComponent(topic)}`;
  const res = await fetchWithTimeout(url, { headers: { Accept: "application/json" } }, 10000);

  if (!res.ok) throw new Error(`Papers proxy returned ${res.status}`);

  const data = await res.json();
  // Server returns { context: string|null }
  return data.context || null;
}

/* 
SERVER PROXY  →  DeepSeek
The browser POSTs topic + context to the backend. 
*/

async function refineWithDeepSeek(topic, paperContext) {
  const res = await fetchWithTimeout(
    CONFIG.server.refineEndpoint,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      const: { topic, paperContext } = req.body,
    },
    CONFIG.server.timeoutMs
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Server proxy error ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();

  // The server returns the parsed result object directly
  if (!data.refined) throw new Error("Server returned an unexpected response shape.");
  return data;
}

/* 
Rule-based fallback engine that works offline with no dependencies. 
It uses simple keyword detection to classify the topic
*/

function ruleBasedRefine(topic) {
  const t = topic.toLowerCase();

  /* ── Classifiers ── */
  const domain = detectDomain(t);
  const population = detectPopulation(t);
  const timeframe = detectTimeframe(t);
  const mechanism = detectMechanism(t);

  /* ── Build refined topic ── */
  let refined = applyNarrowingRules(topic, domain, population, timeframe, mechanism);

  /* ── Variations ── */
  const variations = buildVariations(topic, domain, population);
  return { refined, variations }; 
}

//Domain detection
function detectDomain(t) {
  const map = [
    { keys: ["drug", "substance", "alcohol", "addict", "opioid", "cannabis", "smoking"], domain: "substance-use" },
    { keys: ["mental health", "depression", "anxiety", "stress", "trauma", "ptsd", "wellbeing"], domain: "mental-health" },
    { keys: ["climate", "environment", "carbon", "emission", "pollution", "sustainability"], domain: "environmental" },
    { keys: ["ai", "artificial intelligence", "machine learning", "deep learning", "neural"], domain: "ai-ml" },
    { keys: ["education", "school", "learning", "student", "curriculum", "classroom", "teacher"], domain: "education" },
    { keys: ["gender", "women", "feminism", "lgbtq", "equality", "discrimination"], domain: "gender-studies" },
    { keys: ["economy", "economic", "finance", "gdp", "inflation", "market", "trade"], domain: "economics" },
    { keys: ["diet", "nutrition", "obesity", "food", "eating", "weight"], domain: "nutrition" },
    { keys: ["social media", "tiktok", "instagram", "online", "digital", "internet"], domain: "digital-media" },
    { keys: ["vaccine", "covid", "pandemic", "virus", "disease", "infection", "health"], domain: "public-health" },
    { keys: ["race", "racial", "ethnicity", "diversity", "inclusion", "bias"], domain: "race-equity" },
    { keys: ["crime", "criminal", "police", "law", "justice", "incarceration"], domain: "criminology" },
    { keys: ["politic", "government", "democracy", "vote", "election", "policy"], domain: "political-science" },
  ];
  for (const { keys, domain } of map) {
    if (keys.some((k) => t.includes(k))) return domain;
  }
  return "general";
}

// Population detection 
function detectPopulation(t) {
  if (t.includes("teenager") || t.includes("teen") || t.includes("adolescent")) return "adolescents (ages 13–18)";
  if (t.includes("child") || t.includes("kid")) return "children (ages 6–12)";
  if (t.includes("college") || t.includes("university") || t.includes("undergraduate")) return "undergraduate students";
  if (t.includes("elderly") || t.includes("older adult") || t.includes("senior")) return "older adults (65+)";
  if (t.includes("women") || t.includes("female")) return "women";
  if (t.includes("men") || t.includes("male")) return "men";
  if (t.includes("worker") || t.includes("employee") || t.includes("workplace")) return "employees";
  if (t.includes("immigrant") || t.includes("refugee")) return "immigrant populations";
  if (t.includes("low-income") || t.includes("poverty")) return "low-income communities";
  return null;
}

// Timeframe detection 
function detectTimeframe(t) {
  if (t.includes("pandemic") || t.includes("covid") || t.includes("2020") || t.includes("2021")) return "during the COVID-19 pandemic (2020–2023)";
  if (t.includes("long-term") || t.includes("longitudinal")) return "over a 10-year period";
  if (t.includes("recent") || t.includes("current") || t.includes("today")) return "in the past five years (2019–2024)";
  if (t.includes("historic") || t.includes("history")) return "from a historical perspective (1980–2020)";
  return null;
}

// Mechanism / angle detection 
function detectMechanism(t) {
  if (t.includes("effect") || t.includes("impact") || t.includes("affect")) return "causal effects";
  if (t.includes("predict") || t.includes("factor") || t.includes("determinant")) return "predictive factors";
  if (t.includes("prevent") || t.includes("intervention") || t.includes("program")) return "prevention interventions";
  if (t.includes("perception") || t.includes("attitude") || t.includes("opinion")) return "perceptions and attitudes";
  if (t.includes("policy") || t.includes("regulation") || t.includes("law")) return "policy implications";
  if (t.includes("experience") || t.includes("lived")) return "lived experiences";
  return "underlying mechanisms";
}

// Core narrowing logic 
function applyNarrowingRules(topic, domain, population, timeframe, mechanism) {
  // Template: [mechanism] of [topic core] among [population] [timeframe] 
  const core = stripBroadWords(topic);
  let parts = [];

  // Mechanism prefix 
  const mechPrefix = {
    "causal effects": "The causal effects of",
    "predictive factors": "Key predictors of",
    "prevention interventions": "The effectiveness of school-based interventions targeting",
    "perceptions and attitudes": "Perceptions and attitudes toward",
    "policy implications": "Policy implications of",
    "lived experiences": "Lived experiences of",
    "underlying mechanisms": "The underlying mechanisms linking",
  }[mechanism] || "The relationship between";

  parts.push(mechPrefix);
  parts.push(core);

  if (population) parts.push(`among ${population}`);

  // Add context from domain if no population 
  if (!population) {
    const domainContexts = {
      "substance-use": "in urban community settings",
      "mental-health": "in outpatient clinical populations",
      "environmental": "in developing economies",
      "ai-ml": "in high-stakes decision-making contexts",
      "education": "in under-resourced public schools",
      "economics": "in post-recession labor markets",
      "nutrition": "in food-insecure households",
      "digital-media": "in Gen Z social networks",
      "public-health": "in rural healthcare systems",
      "criminology": "in urban justice systems",
    };
    if (domainContexts[domain]) parts.push(domainContexts[domain]);
  }
  if (timeframe) parts.push(timeframe);
  return parts.join(" ") + ".";
}

// Strip overly broad words from the core topic 
function stripBroadWords(topic) {
  return topic
    .replace(/\b(effects?|impact|influence|role|study|research|analysis|effects of|impact of)\b/gi, "")
    .replace(/\bof\s+of\b/gi, "of")   // ← add this line
    .replace(/\s+/g, " ")
    .trim();
}

// Build 3 genuine alternative angles 
function buildVariations(topic, domain, population) {
  const pop = population || "general populations";
  const domainAngles = {
    "substance-use": [
      `Neurobiological pathways through which early substance use disrupts prefrontal cortex development in ${pop}`,
      `Peer social network influence on initiation and escalation of substance use among ${pop}`,
      `Racial and socioeconomic disparities in substance use treatment access for ${pop}`,
    ],
    "mental-health": [
      `Stigma as a barrier to mental health help-seeking behaviour among ${pop}`,
      `Digital mental health intervention efficacy compared to traditional therapy for ${pop}`,
      `Adverse childhood experiences as predictors of adult mental health outcomes in ${pop}`,
    ],
    "ai-ml": [
      `Algorithmic bias in AI hiring tools and its differential impact on minority job-seekers`,
      `Explainability requirements for AI diagnostic systems in clinical medicine`,
      `Human-AI collaboration dynamics and trust calibration in high-stakes domains`,
    ],
    "education": [
      `Teacher implicit bias and its effect on academic achievement gaps in ${pop}`,
      `Gamification as a pedagogical tool for improving STEM engagement in ${pop}`,
      `Socioeconomic access barriers to remote and hybrid learning for ${pop}`,
    ],
    "environmental": [
      `Disproportionate climate vulnerability among low-income coastal communities`,
      `Corporate sustainability pledges vs. measurable emissions reductions: a greenwashing analysis`,
      `Youth climate activism as a driver of national environmental policy change`,
    ],
    "digital-media": [
      `Algorithmic amplification of misinformation and its effect on political polarisation`,
      `Social comparison on image-based platforms and body image dissatisfaction in ${pop}`,
      `Screen time displacement of sleep and its downstream effects on ${pop}`,
    ],
    "public-health": [
      `Vaccine hesitancy predictors among rural and underserved communities`,
      `Health misinformation spread on social media during public health emergencies`,
      `Primary care access inequality and its effect on chronic disease management in ${pop}`,
    ],
  };

  if (domainAngles[domain]) return domainAngles[domain];

  // Generic fallback angles 
  return [
    `A comparative analysis of ${topic} across different demographic groups`,
    `Long-term outcomes of ${topic}: a 10-year longitudinal perspective`,
    `Policy interventions targeting ${topic}: effectiveness and unintended consequences`,
  ];
} 

// Render result
function renderResult(result, originalTopic) {
  const card = document.getElementById("resultCard");
  const refinedEl = document.getElementById("refinedTopic");
  const variationsEl = document.getElementById("variations"); 

  if (!card || !refinedEl || !variationsEl) {
    console.error("renderResult: missing DOM elements", {
      card:        !!card,
      refinedEl:   !!refinedEl,
      variationsEl: !!variationsEl,
    });
    return;
  }

  refinedEl.textContent = result.refined || "No refined topic generated.";

  if (result.variations?.length) {
    variationsEl.innerHTML = `
    <div class="result-section">
      <div class="result-section-title">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        Alternative Angles
      </div>
      <ul class="variation-list">
        ${result.variations.map((v) => `<li>${v}</li>`).join("")}
      </ul>
    </div>`;
    } else {
    variationsEl.innerHTML = "";
  }

  card.style.display = "block";
  card.scrollIntoView({ behavior: "smooth", block: "start" });
}

// History 
function saveHistory(original, refined) {
  try {
    const raw = localStorage.getItem(CONFIG.history.storageKey);
    let history = raw ? JSON.parse(raw) : [];

    history.unshift({ original, refined, ts: Date.now() });
    history = history.slice(0, CONFIG.history.maxItems);

    localStorage.setItem(CONFIG.history.storageKey, JSON.stringify(history));
    renderHistory(history);
  } catch (_) {
    /* localStorage unavailable — silently skip */
  }
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(CONFIG.history.storageKey);
    if (!raw) return;
    const history = JSON.parse(raw);
    if (history.length) renderHistory(history);
  } catch (_) {}
}

function renderHistory(history) {
  const section = document.getElementById("historySection");
  const list = document.getElementById("historyList");

  if (!history.length) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";
  list.innerHTML = history
    .map(
      (item) => `
      <div class="history-item" onclick="document.getElementById('subfield').value='${escHtml(item.original)}';document.getElementById('subfield').focus()">
        <div class="history-original">${escHtml(item.original)}</div>
        <div class="history-refined">${escHtml(item.refined)}</div>
      </div>`
    )
    .join("");
}

// UI Helpers  
function startLoading() {
  isLoading = true;
  document.getElementById("loadingOverlay").style.display = "flex";
  document.getElementById("generateBtn").disabled = true;
  document.getElementById("btnSpinnerEl").style.display = "inline-block";
  document.getElementById("btnIcon").style.display = "none";
  document.getElementById("btnText").textContent = "Refining…";
  clearError();
}

function stopLoading() {
  isLoading = false;
  document.getElementById("loadingOverlay").style.display = "none";
  document.getElementById("generateBtn").disabled = false;
  document.getElementById("btnSpinnerEl").style.display = "none";
  document.getElementById("btnIcon").style.display = "inline";
  document.getElementById("btnText").textContent = "Fine-tune Research Topic";
}

function setStatus(msg) {
  const el = document.getElementById("loadingStatus");
  if (el) el.textContent = msg;
}

function showError(msg) {
  const box = document.getElementById("errorBox");
  if (box) {
    box.textContent = msg;
    box.style.display = "block";
  }
}

function clearError() {
  const box = document.getElementById("errorBox");
  if (box) box.style.display = "none";
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Utilities 
async function fetchWithTimeout(url, options = {}, ms = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

function artificialDelay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

document.addEventListener("DOMContentLoaded", () => {
  loadHistory();

  const input = document.getElementById("subfield");
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") refineTopic();
    });
  }
});



