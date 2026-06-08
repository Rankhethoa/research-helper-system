/*
Extraction strategy per PDF:
  1. pdf-parse  → fast text extraction (works for text-based PDFs)
  2. If extracted text is too sparse (<100 meaningful chars per page),
      fall back to Tesseract OCR via pdf-to-img page rasterisation
 */

import { Router }         from "express";
import { createRequire }  from "module";

const require        = createRequire(import.meta.url);
const multer         = require("multer");
const pdfParse       = require("pdf-parse");
const Tesseract      = require("tesseract.js");
const { fromBuffer } = require("pdf2pic");
import fs            from "fs";
import os            from "os";
import pathMod       from "path";
import { callDeepSeek } from "../services/deepseek.js";
import { buildFallback } from "../utils/helpers.js";

const router = Router();

const MAX_CHARS_PER_DOC  = 8000;  // chars sent to AI per PDF
const MIN_CHARS_PER_PAGE = 100;   // below this → treat page as scanned
const MAX_OCR_PAGES      = 20;    // cap OCR at 20 pages to avoid timeout
const OCR_DPI            = 200;   // higher = better accuracy, slower

//MULTER — memory storage, PDF only, max 5 files
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error(`"${file.originalname}" is not a PDF.`));
  },
});

//Text extraction with OCR fallback for scanned PDFs

/*
Attempt fast text extraction with pdf-parse.
Returns { text, pages, method: "text" } or null if too sparse.

 * @param {Buffer} buffer
 * @param {number} totalPages
 * @returns {Promise<{ text: string, pages: number, method: string } | null>}
*/
async function tryTextExtraction(buffer, totalPages) {
  try {
    const data  = await pdfParse(buffer);
    const text  = data.text.replace(/\s+/g, " ").trim();
    const pages = data.numpages || totalPages;

    // Heuristic: if average chars per page is below threshold, it's likely scanned
    const avgCharsPerPage = text.length / Math.max(pages, 1);
    if (avgCharsPerPage < MIN_CHARS_PER_PAGE) return null;

    return { text: text.slice(0, MAX_CHARS_PER_DOC), pages, method: "text" };
  } catch (_) {
    return null;
  }
}

/*
OCR fallback using Tesseract.js.
Writes PDF to a temp file, rasterises each page to a temp PNG via
pdf2pic, runs Tesseract on the PNG file path, then cleans up.
 * @param {Buffer} buffer
 * @param {string} filename
 * @returns {Promise<{ text: string, pages: number, method: string, truncated: boolean, ocrPages: number }>}
*/
async function ocrExtraction(buffer, filename) {
  // Create a unique temp directory for this job
  const tmpDir  = fs.mkdtempSync(pathMod.join(os.tmpdir(), "litreview-"));

  // Get page count
  let totalPages = 1;
  try {
    const meta = await pdfParse(buffer, { max: 1 });
    totalPages  = meta.numpages || 1;
  } catch (_) {}

  const pagesToOcr = Math.min(totalPages, MAX_OCR_PAGES);

  const converter = fromBuffer(buffer, {
    density:      OCR_DPI,
    format:       "png",
    width:        1700,
    height:       2200,
    saveFilename: "page",
    savePath:     tmpDir,
  });

  const pageTexts = [];

  for (let i = 1; i <= pagesToOcr; i++) {
    let imgPath;
    try {
      // Convert page → saves as tmpDir/page.<i>.png
      const result = await converter(i, { responseType: "image" });
      imgPath = result?.path || result?.name;

      if (!imgPath || !fs.existsSync(imgPath)) {
        // pdf2pic sometimes zero-pads the page number
        const padded = String(i).padStart(totalPages.toString().length, "0");
        const candidate = pathMod.join(tmpDir, `page.${padded}.png`);
        imgPath = fs.existsSync(candidate) ? candidate : null;
      }

      if (!imgPath) {
        console.warn(`[OCR] no image produced for page ${i} of "${filename}"`);
        continue;
      }

      const { data } = await Tesseract.recognize(imgPath, "eng", {
        logger: () => {},  // suppress verbose progress logs
      });

      if (data.text?.trim()) pageTexts.push(data.text.trim());
    } catch (err) {
      console.warn(`[OCR] page ${i} of "${filename}" failed:`, err.message);
    }
  }

  // Clean up temp directory
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}

  return {
    text:      pageTexts.join("\n\n").slice(0, MAX_CHARS_PER_DOC),
    pages:     totalPages,
    method:    "ocr",
    truncated: pagesToOcr < totalPages,
    ocrPages:  pagesToOcr,
  };
}

/*
Master extraction function.
Tries text extraction first; falls back to OCR if the PDF is scanned.
 * @param {Buffer} buffer
 * @param {string} filename
 * @returns {Promise<{ filename, text, pages, method, truncated, ocrPages? }>}
*/
async function extractText(buffer, filename) {
  // Quick page-count probe
  let totalPages = 1;
  try {
    const probe = await pdfParse(buffer, { max: 0 });
    totalPages  = probe.numpages || 1;
  } catch (_) {}

  // Step 1 — fast text extraction
  const textResult = await tryTextExtraction(buffer, totalPages);
  if (textResult) {
    return {
      filename,
      truncated: textResult.text.length >= MAX_CHARS_PER_DOC,
      ...textResult,
    };
  }

  // Step 2 — OCR fallback
  console.log(`[litReview] "${filename}" is sparse/scanned — running OCR`);
  const ocrResult = await ocrExtraction(buffer, filename);
  return { filename, ...ocrResult };
}

/* 
   Rule-based fallback engine
   Fully offline — no network calls, no AI.
   Produces feasible, domain-aware analysis from extracted PDF text alone.

   Pipeline:
     1. tokenise + stopword-filter each doc
     2. TF-IDF keyword extraction per doc
     3. Domain classification via weighted keyword dictionaries
     4. Metadata extraction (title, authors, year, abstract)
     5. Methodology classification
     6. Sentence-level extraction for findings, limitations, gaps, future work
     7. Cross-doc conflict detection via contradiction signal patterns
     8. Agreement detection via shared high-weight keywords
     9. Assemble final result object matching the AI response shape exactly
*/

// Constants 

const THEME_COLORS = ["teal", "blue", "purple", "sage", "amber", "gold"];

// Common English stopwords — excluded from TF-IDF keyword extraction
const STOPWORDS = new Set([
  "a","about","above","after","again","against","all","also","am","an","and",
  "any","are","as","at","be","because","been","before","being","between","but",
  "by","can","did","do","does","doing","during","each","few","for","from","further",
  "had","has","have","having","he","her","here","him","his","how","i","if","in",
  "into","is","it","its","itself","just","me","more","most","my","no","not","now",
  "of","on","once","only","or","other","our","out","over","own","same","she","so",
  "some","such","than","that","the","their","them","then","there","these","they",
  "this","those","through","to","too","under","until","up","us","was","we","were",
  "what","when","where","which","while","who","whom","will","with","you","your",
  "would","could","should","may","might","shall","been","these","both","very",
  "much","many","well","new","use","used","using","also","thus","hence","within",
  "across","among","via","per","one","two","three","four","five","six","seven",
  "eight","nine","ten","et","al","ie","eg","study","paper","research","article",
  "findings","results","data","analysis","based","using","used","shows","shown",
]);

// Domain dictionaries — label, weighted keyword list, associated gaps and directions
const DOMAIN_DICTS = [
  {
    label:      "Mental Health & Psychology",
    keys:       { mental: 3, depression: 3, anxiety: 3, psychological: 3, therapy: 2, cognitive: 2, behaviour: 2, behavior: 2, stress: 2, wellbeing: 2, trauma: 2, ptsd: 3, psychiatric: 2, disorder: 2, intervention: 2, mindfulness: 2, emotion: 2, resilience: 2 },
    gaps:       ["Longitudinal studies tracking mental health outcomes beyond 12 months remain scarce.", "Research rarely accounts for cultural variation in psychological symptom expression.", "Few studies examine the intersection of socioeconomic status and treatment access."],
    futures:    ["Develop culturally adapted psychological interventions for underserved populations.", "Conduct randomised controlled trials with longer follow-up periods.", "Investigate digital mental health tools as scalable alternatives to in-person therapy."],
    methods:    ["Randomised controlled trial", "Longitudinal cohort study", "Systematic review and meta-analysis", "Cross-sectional survey"],
  },
  {
    label:      "Substance Use & Addiction",
    keys:       { substance: 3, drug: 3, alcohol: 3, addiction: 3, opioid: 3, cannabis: 2, smoking: 2, tobacco: 2, dependence: 3, withdrawal: 2, treatment: 2, relapse: 3, abuse: 2, misuse: 2, craving: 2, recovery: 2 },
    gaps:       ["Long-term recovery outcomes beyond two years are rarely tracked in the literature.", "Adolescent-specific substance use pathways are underexplored.", "The role of social networks in relapse remains poorly understood."],
    futures:    ["Implement community-based participatory research in substance use prevention.", "Study neurobiological mechanisms of addiction to inform pharmacological treatment.", "Evaluate peer-support programmes as adjuncts to clinical treatment."],
    methods:    ["Longitudinal cohort study", "Randomised controlled trial", "Qualitative interview study", "Mixed-methods design"],
  },
  {
    label:      "Machine Learning & Artificial Intelligence",
    keys:       { machine: 2, learning: 2, neural: 3, deep: 2, algorithm: 3, model: 2, classification: 3, prediction: 2, accuracy: 2, training: 2, dataset: 2, feature: 2, network: 2, ai: 3, nlp: 3, transformer: 3, embedding: 2, inference: 2 },
    gaps:       ["Model interpretability and explainability remain major open challenges.", "Benchmark datasets often fail to represent real-world distribution shifts.", "Ethical and bias implications of deployed models are insufficiently studied."],
    futures:    ["Develop explainable AI frameworks that are accessible to domain non-experts.", "Investigate federated learning approaches to preserve data privacy.", "Create more diverse and representative benchmark datasets."],
    methods:    ["Empirical benchmark evaluation", "Ablation study", "Systematic literature review", "Human evaluation study"],
  },
  {
    label:      "Education & Pedagogy",
    keys:       { education: 3, learning: 2, student: 2, teacher: 2, school: 2, curriculum: 3, classroom: 2, pedagogy: 3, instruction: 2, academic: 2, literacy: 2, assessment: 2, performance: 2, engagement: 2, motivation: 2, university: 2 },
    gaps:       ["Evidence on long-term retention effects of pedagogical interventions is limited.", "Technology-enhanced learning outcomes are rarely compared against active baseline conditions.", "Research underrepresents students from low-income and rural backgrounds."],
    futures:    ["Conduct longitudinal studies tracking student outcomes beyond graduation.", "Investigate adaptive learning systems for personalised instruction at scale.", "Explore teacher professional development as a mediator of student achievement."],
    methods:    ["Quasi-experimental design", "Randomised controlled trial", "Case study", "Systematic review"],
  },
  {
    label:      "Public Health & Epidemiology",
    keys:       { health: 2, disease: 3, infection: 3, pandemic: 3, vaccine: 3, mortality: 3, morbidity: 2, prevalence: 3, incidence: 3, epidemic: 3, population: 2, risk: 2, prevention: 2, intervention: 2, surveillance: 3, clinical: 2 },
    gaps:       ["Health equity dimensions are absent from most epidemiological models.", "Surveillance data from low- and middle-income countries is systematically underrepresented.", "Long-term post-infection sequelae are rarely captured in standard surveillance systems."],
    futures:    ["Integrate social determinants of health into epidemiological modelling frameworks.", "Build sentinel surveillance systems in underserved regions.", "Conduct prospective cohort studies to quantify long-term disease burden."],
    methods:    ["Prospective cohort study", "Case-control study", "Systematic review and meta-analysis", "Agent-based modelling"],
  },
  {
    label:      "Environmental Science & Sustainability",
    keys:       { climate: 3, environment: 2, carbon: 3, emission: 3, pollution: 3, sustainability: 3, biodiversity: 3, ecosystem: 3, renewable: 2, energy: 2, greenhouse: 3, deforestation: 3, conservation: 2, ecological: 2 },
    gaps:       ["Socioeconomic co-benefits of environmental interventions are systematically overlooked.", "Research rarely disaggregates climate vulnerability by income quintile.", "Long-term ecosystem recovery trajectories following intervention remain poorly characterised."],
    futures:    ["Model the distributional equity impacts of carbon pricing mechanisms.", "Conduct longitudinal ecological monitoring in post-restoration sites.", "Integrate indigenous ecological knowledge into conservation planning frameworks."],
    methods:    ["Longitudinal ecological monitoring", "Remote sensing analysis", "Systematic review", "Mixed-methods policy evaluation"],
  },
  {
    label:      "Economics & Policy",
    keys:       { economic: 3, economy: 2, gdp: 3, inflation: 3, market: 2, fiscal: 3, monetary: 3, policy: 2, trade: 2, labour: 2, labor: 2, employment: 2, income: 2, inequality: 3, poverty: 3, welfare: 2 },
    gaps:       ["Distributional effects of macroeconomic policies across income quintiles are rarely modelled.", "Informal economy dynamics are systematically excluded from standard economic analyses.", "Policy evaluation rarely accounts for general equilibrium spillover effects."],
    futures:    ["Apply quasi-experimental methods to natural policy experiments.", "Model informal sector dynamics alongside formal economic indicators.", "Investigate heterogeneous treatment effects of fiscal interventions across demographic groups."],
    methods:    ["Difference-in-differences", "Regression discontinuity design", "Instrumental variables", "Systematic review"],
  },
  {
    label:      "Social Sciences & Sociology",
    keys:       { social: 2, society: 2, culture: 2, gender: 3, race: 2, ethnicity: 2, inequality: 3, identity: 2, community: 2, class: 2, power: 2, discrimination: 3, inclusion: 2, diversity: 2, norm: 2, institution: 2 },
    gaps:       ["Intersectionality is rarely operationalised quantitatively in sociological analyses.", "Longitudinal studies capturing social mobility across generations are limited.", "Research predominantly reflects WEIRD (Western, Educated, Industrialised, Rich, Democratic) populations."],
    futures:    ["Develop mixed-methods frameworks that capture structural and experiential dimensions simultaneously.", "Conduct cross-national comparative studies with matched sampling designs.", "Integrate participatory action research to centre marginalised community voices."],
    methods:    ["Ethnographic fieldwork", "Mixed-methods design", "Grounded theory", "Cross-sectional survey"],
  },
  {
    label:      "Biomedical & Clinical Research",
    keys:       { biomedical: 3, clinical: 2, patient: 2, hospital: 2, treatment: 2, drug: 2, therapy: 2, diagnosis: 3, biomarker: 3, gene: 2, protein: 2, cell: 2, trial: 3, randomised: 3, randomized: 3, placebo: 3, dosage: 2, efficacy: 3 },
    gaps:       ["Sex and gender are rarely considered as biological variables in preclinical models.", "Replication studies are systematically undervalued and underreported.", "Patient-reported outcomes are underutilised relative to clinical endpoints."],
    futures:    ["Mandate sex-disaggregated reporting in all clinical trial registrations.", "Invest in replication and registered reports to address reproducibility concerns.", "Incorporate patient-reported outcome measures alongside traditional clinical endpoints."],
    methods:    ["Randomised controlled trial", "Systematic review and meta-analysis", "Case-control study", "Prospective cohort"],
  },
  {
    label:      "Methodology & Research Design",
    keys:       { methodology: 3, method: 2, validity: 3, reliability: 3, sampling: 3, measurement: 2, instrument: 2, survey: 2, interview: 2, qualitative: 3, quantitative: 3, mixed: 2, triangulation: 3, bias: 2, replication: 3 },
    gaps:       ["Measurement invariance across groups is rarely tested before conducting comparisons.", "Publication bias systematically inflates positive finding rates in the literature.", "Replication studies remain structurally disincentivised in academic publishing."],
    futures:    ["Adopt pre-registration as standard practice to reduce researcher degrees of freedom.", "Publish null results in dedicated outlets to correct publication bias.", "Develop domain-specific reporting guidelines modelled on CONSORT and STROBE."],
    methods:    ["Meta-analysis", "Systematic review", "Methodological review", "Simulation study"],
  },
];

// Utilities

//Tokenise text into lowercase words, stripping punctuation and stopwords
function tokenise(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/*
Compute term frequency map for a token array.
 * @param {string[]} tokens
 * @returns {Map<string, number>}
*/
function termFrequency(tokens) {
  const tf = new Map();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  return tf;
}

/*
Split text into sentences, returning only those with 15–300 chars
that are not headers or reference lines.
 * @param {string} text
 * @returns {string[]}
*/
function sentences(text) {
  return (text.match(/[^.!?]+[.!?]+/g) || [])
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => {
      const l = s.length;
      return (
        l >= 40 && l <= 350 &&
        !/^\s*\d+[\.\)]/.test(s) &&       // numbered list items
        !/^\s*\[?\d+\]/.test(s) &&         // reference entries
        !/^https?:/.test(s)                // URLs
      );
    });
}

/*
Extract the best-scoring sentences containing any of the given keywords,
scored by keyword density and sentence length.
 * @param {string} text
 * @param {string[]} keywords
 * @param {number}   n         max results
 * @param {number}   [minLen]  minimum sentence char length
 * @returns {string[]}
*/
function extractBest(text, keywords, n, minLen = 60) {
  const lower = keywords.map((k) => k.toLowerCase());
  return sentences(text)
    .filter((s) => s.length >= minLen)
    .map((s) => {
      const sl   = s.toLowerCase();
      const hits = lower.reduce((c, k) => c + (sl.includes(k) ? 1 : 0), 0);
      const density = hits / (s.split(" ").length || 1);
      return { s, score: hits * 10 + density * 5 };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.s);
}


/*
Infer the paper title from the first 600 chars.
Preference: a line in ALL CAPS or Title Case, 15–140 chars, not a URL/date.
 * @param {string} text
 * @param {string} filename
 * @returns {string}
*/
function inferTitle(text, filename) {
  const head  = text.slice(0, 600);
  const lines = head.split(/\n+/).map((l) => l.trim()).filter((l) => l.length >= 15 && l.length <= 140);

  // Prefer lines that look like a title (most words capitalised or all caps, not just a sentence)
  const titleLine = lines.find((l) => {
    if (/^https?:/.test(l) || /^\d{4}/.test(l)) return false;
    const words    = l.split(/\s+/);
    const capCount = words.filter((w) => /^[A-Z]/.test(w)).length;
    return capCount >= Math.ceil(words.length * 0.5);
  });

  return titleLine || lines[0] || filename.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
}

/*
Extract author names from the first 800 chars.
Looks for patterns like "Firstname Lastname" clusters near "abstract" or "introduction",
or lines containing commas between capitalised name tokens.
 * @param {string} text
 * @returns {string}
*/
function inferAuthors(text) {
  const head = text.slice(0, 800);

  // Pattern: "A. Lastname, B. Lastname" or "John Smith, Jane Doe"
  const namePattern = /\b([A-Z][a-z]+\.?\s+[A-Z][a-z]{2,}(?:,\s*[A-Z][a-z]+\.?\s+[A-Z][a-z]{2,})*)\b/g;
  const matches     = [...head.matchAll(namePattern)].map((m) => m[1].trim());

  if (matches.length) {
    // Pick the longest match (most likely the author list)
    return matches.sort((a, b) => b.length - a.length)[0];
  }

  // Fallback: look for "et al." patterns
  const etAl = head.match(/([A-Z][a-z]+ et al\.)/);
  if (etAl) return etAl[1];

  return "Authors not identified";
}

/*
Extract publication year from text (first 4-digit year between 1970–2030).
 * @param {string} text
 * @returns {string}
*/
function inferYear(text) {
  const match = text.slice(0, 1000).match(/\b(19[7-9]\d|20[0-2]\d)\b/);
  return match ? match[1] : "Year not identified";
}

/*
Extract the abstract — text between "abstract" heading and "introduction"
heading, or first dense paragraph if no headings found.
 * @param {string} text
 * @returns {string}
*/
function inferAbstract(text) {
  // Try section-bounded extraction
  const lower = text.toLowerCase();
  const absStart  = lower.search(/\babstract\b/);
  const introStart = lower.search(/\bintroduction\b/);

  if (absStart !== -1 && introStart > absStart) {
    const raw = text.slice(absStart + 8, introStart).replace(/\s+/g, " ").trim();
    if (raw.length >= 80) return raw.slice(0, 500) + (raw.length > 500 ? "…" : "");
  }

  // Fallback: first paragraph with >= 100 chars
  const paras = text.split(/\n{2,}/).map((p) => p.replace(/\s+/g, " ").trim()).filter((p) => p.length >= 100);
  if (paras.length) return paras[0].slice(0, 500) + (paras[0].length > 500 ? "…" : "");

  return "Abstract not identified in extracted text.";
}

// Domain classification

/*
Classify a document into one or more domains using weighted keyword scoring.
Returns domains sorted by score descending.
 * @param {string[]} tokens
 * @returns {{ domain: object, score: number }[]}
*/
function classifyDomains(tokens) {
  const tf = termFrequency(tokens);

  return DOMAIN_DICTS
    .map((domain) => {
      const score = Object.entries(domain.keys).reduce((sum, [term, weight]) => {
        return sum + (tf.get(term) || 0) * weight;
      }, 0);
      return { domain, score };
    })
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score);
}

/* Methodology classification */

const METHODOLOGY_PATTERNS = [
  { label: "Systematic review and meta-analysis",   keys: ["systematic review", "meta-analysis", "meta analysis"] },
  { label: "Randomised controlled trial (RCT)",     keys: ["randomised controlled", "randomized controlled", "rct", "placebo", "double-blind", "double blind"] },
  { label: "Longitudinal cohort study",             keys: ["longitudinal", "cohort", "follow-up", "follow up", "prospective"] },
  { label: "Cross-sectional survey",                keys: ["cross-sectional", "cross sectional", "survey", "questionnaire"] },
  { label: "Case-control study",                    keys: ["case-control", "case control", "odds ratio"] },
  { label: "Qualitative interview study",           keys: ["qualitative", "interview", "focus group", "thematic analysis", "grounded theory"] },
  { label: "Mixed-methods study",                   keys: ["mixed method", "mixed-method", "quantitative and qualitative"] },
  { label: "Experimental study",                    keys: ["experiment", "laboratory", "lab study", "controlled experiment"] },
  { label: "Computational / simulation study",      keys: ["simulation", "computational", "agent-based", "model-based"] },
  { label: "Case study",                            keys: ["case study", "single case", "multiple case"] },
];

/*
Identify the most likely methodology from text.
 * @param {string} text
 * @returns {string}
*/
function classifyMethodology(text) {
  const lower = text.toLowerCase();
  const scored = METHODOLOGY_PATTERNS
    .map(({ label, keys }) => ({
      label,
      hits: keys.reduce((n, k) => n + (lower.includes(k) ? 1 : 0), 0),
    }))
    .filter((m) => m.hits > 0)
    .sort((a, b) => b.hits - a.hits);

  return scored[0]?.label || "Methodology not clearly identifiable from extracted text";
}

/* TF-IDF keyword extraction */

/*
Extract the top `n` meaningful keywords from a doc using TF-IDF
against the other docs as the corpus.
 * @param {string[]} docTokens     tokens for this document
 * @param {string[][]} allDocTokens tokens for all documents
 * @param {number} n
 * @returns {string[]}
*/
function tfidfKeywords(docTokens, allDocTokens, n = 8) {
  const tf       = termFrequency(docTokens);
  const docCount = allDocTokens.length;

  // IDF: log(N / df) where df = number of docs containing the term
  const keywords = [...tf.entries()].map(([term, freq]) => {
    const df  = allDocTokens.filter((dt) => dt.includes(term)).length;
    const idf = Math.log((docCount + 1) / (df + 1)) + 1;
    return { term, score: (freq / docTokens.length) * idf };
  });

  return keywords
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((k) => k.term);
}

// Cross-document conflict detection

/* Contradiction signal pairs — if doc A has signal A and doc B has signal B
on the same topic keyword, flag as potential conflict
*/
const CONTRADICTION_PAIRS = [
  { a: ["significant",  "effective",   "improves",   "positive effect", "increases"],
    b: ["no significant","not effective","no effect",  "negative effect", "decreases"] },
  { a: ["supports",     "confirms",    "validates",  "consistent with"],
    b: ["contradicts",  "refutes",     "challenges", "inconsistent with"] },
  { a: ["high prevalence", "widespread", "common"],
    b: ["low prevalence",  "rare",       "uncommon"] },
  { a: ["safe",  "well-tolerated", "no adverse"],
    b: ["unsafe","adverse effects","side effects","harmful"] },
];

/*
Detect potential conflicts between pairs of documents.
Returns an array of conflict objects (may be empty).
 * @param {{ filename, text }[]} docs
 * @returns {{ claim1, source1, claim2, source2 }[]}
*/
function detectConflicts(docs) {
  if (docs.length < 2) return [];

  const conflicts = [];

  for (let i = 0; i < docs.length - 1; i++) {
    for (let j = i + 1; j < docs.length; j++) {
      const textA = docs[i].text.toLowerCase();
      const textB = docs[j].text.toLowerCase();

      for (const { a, b } of CONTRADICTION_PAIRS) {
        const aInA = a.some((sig) => textA.includes(sig));
        const bInA = b.some((sig) => textA.includes(sig));
        const aInB = a.some((sig) => textB.includes(sig));
        const bInB = b.some((sig) => textB.includes(sig));

        // doc i has positive signal and doc j has negative signal (or vice-versa)
        if ((aInA && bInB) || (bInA && aInB)) {
          const sentA = extractBest(docs[i].text, a.concat(b), 1, 40)[0];
          const sentB = extractBest(docs[j].text, a.concat(b), 1, 40)[0];

          if (sentA && sentB && sentA !== sentB) {
            conflicts.push({
              claim1:  sentA.slice(0, 200),
              source1: docs[i].filename,
              claim2:  sentB.slice(0, 200),
              source2: docs[j].filename,
            });
            break; // one conflict per pair
          }
        }
      }
    }
  }

  return conflicts.slice(0, 4); // max 4 conflicts shown
}

// Agreement detection

/*
Find shared high-weight keywords across all docs and express as
readable agreement statements.
 * @param {string[][]} allTokens  one token array per doc
 * @param {string[]}   filenames
 * @returns {string[]}
*/
function detectAgreements(allTokens, filenames) {
  if (allTokens.length < 2) return ["Single document — cross-document agreements not applicable."];

  // Find terms present in ALL documents
  const termSets  = allTokens.map((t) => new Set(t));
  const universal = [...termSets[0]].filter((term) =>
    term.length > 4 && termSets.every((s) => s.has(term))
  );

  if (!universal.length) {
    return ["No strongly shared terminology detected across documents — topics may be complementary rather than overlapping."];
  }

  // Pick top 4 by average frequency
  const ranked = universal
    .map((term) => ({
      term,
      avgFreq: allTokens.reduce((s, t) => s + t.filter((x) => x === term).length, 0) / allTokens.length,
    }))
    .sort((a, b) => b.avgFreq - a.avgFreq)
    .slice(0, 4);

  return ranked.map(({ term }) =>
    `All ${filenames.length} documents consistently engage with concepts related to "${term}", suggesting a shared theoretical or empirical focus.`
  );
}

/* Theme scoring  */

/*
Score all domains for a given token array and return a normalised pct.
 * @param {string[]} tokens
 * @returns {{ label, score }[]}
*/
function scoreThemes(tokens) {
  const tf = termFrequency(tokens);
  return DOMAIN_DICTS.map((domain) => ({
    label: domain.label,
    score: Object.entries(domain.keys).reduce((s, [k, w]) => s + (tf.get(k) || 0) * w, 0),
  })).filter((d) => d.score > 0).sort((a, b) => b.score - a.score);
}

/* Gap generation */

/*
Produce research gaps by:
 1. Extracting gap-signal sentences from the text
 2. Supplementing with domain-specific canonical gaps if < 3 found
 * @param {string}   text
 * @param {object[]} domains  classified domains for this doc
 * @returns {{ severity, text }[]}
*/
function generateGaps(text, domains) {
  const extracted = extractBest(
    text,
    ["gap", "lack", "limited", "unclear", "understudied", "future research",
     "further study", "not yet", "remain", "warrant", "need to", "little is known"],
    4, 60
  ).map((s, i) => ({
    severity: ["Critical", "Moderate", "Emerging", "Emerging"][i],
    text:     s,
  }));

  // Supplement with canonical domain gaps if we have fewer than 3
  const canonical = (domains[0]?.domain.gaps || []).map((t, i) => ({
    severity: ["Moderate", "Emerging", "Emerging"][i] || "Emerging",
    text: t,
  }));

  const combined = [...extracted, ...canonical];
  // Deduplicate by first 40 chars
  const seen = new Set();
  return combined.filter(({ text: t }) => {
    const key = t.slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 4);
}

/* Future directions  */

/*
Generate future research directions from text + domain knowledge.
 * @param {string}   text
 * @param {object[]} domains
 * @returns {string[]}
*/
function generateFutureDirections(text, domains) {
  const extracted = extractBest(
    text,
    ["future research", "further study", "should investigate", "warrant",
     "next step", "recommend", "future work", "further examine"],
    3, 60
  );

  const canonical = domains[0]?.domain.futures || [
    "Conduct longitudinal studies to establish causal relationships.",
    "Replicate findings across culturally diverse populations.",
    "Explore mixed-methods designs to triangulate quantitative findings with qualitative insight.",
  ];

  return [...new Set([...extracted, ...canonical])].slice(0, 4);
}

// Per-document summary builder

/*
Build a fully analysed summary for a single document.
 * @param {{ filename, text, pages, method, truncated }} doc
 * @param {string[][]} allTokens  tokens for all docs (for TF-IDF)
 * @returns {object}
*/
function buildDocSummary(doc, allTokens) {
  const text    = doc.text || "";
  const tokens  = tokenise(text);
  const domains = classifyDomains(tokens);
  const topKeys = tfidfKeywords(tokens, allTokens, 6);

  // Key themes: top TF-IDF keywords, capitalised
  const keyThemes = topKeys.map((k) => k.charAt(0).toUpperCase() + k.slice(1));

  const findings = extractBest(text,
    ["found", "result", "show", "suggest", "demonstrate", "conclude",
     "evidence", "indicates", "reveals", "significant", "effect", "impact"], 3);

  const limitations = extractBest(text,
    ["limitation", "limited", "constraint", "cannot", "unable",
     "sample size", "generaliz", "bias", "confound"], 1).join(" ")
    || domains[0]?.domain.gaps[0]
    || "Limitations not explicitly stated in the extracted text.";

  return {
    filename:    doc.filename,
    title:       inferTitle(text, doc.filename),
    authors:     inferAuthors(text),
    year:        inferYear(text),
    abstract:    inferAbstract(text),
    keyThemes:   keyThemes.length ? keyThemes : ["General Academic Research"],
    methodology: classifyMethodology(text),
    keyFindings: findings.length
      ? findings
      : ["Key findings not extractable from the available text."],
    limitations,
  };
}

// Master fallback builder

/*
Build a complete rule-based analysis from extracted docs.
Output shape is identical to the DeepSeek response so the frontend
renders without any modification.
 *
 * @param {Array} docs
 * @returns {object}
*/
function buildUploadFallback(docs) {
  const allTokens    = docs.map((d) => tokenise(d.text || ""));
  const docSummaries = docs.map((doc, i) => buildDocSummary(doc, allTokens));

  // Aggregate themes
  const themeScoreMap = {};
  docs.forEach((d, i) => {
    scoreThemes(allTokens[i]).forEach(({ label, score }) => {
      themeScoreMap[label] = (themeScoreMap[label] || 0) + score;
    });
  });

  const totalScore = Object.values(themeScoreMap).reduce((s, n) => s + n, 1);
  let themes = Object.entries(themeScoreMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([label, score], i) => ({
      label,
      pct:   Math.max(Math.round((score / totalScore) * 100), 5),
      color: THEME_COLORS[i % THEME_COLORS.length],
    }));

  // Enforce strict descending order
  for (let i = 1; i < themes.length; i++) {
    if (themes[i].pct >= themes[i - 1].pct) themes[i].pct = themes[i - 1].pct - 1;
    themes[i].pct = Math.max(themes[i].pct, 5);
  }

  if (!themes.length) themes = [{ label: "General Academic Research", pct: 100, color: "teal" }];

  // Comparisons table 
  const aspects    = ["Methodology", "Key Findings", "Limitations", "Sample / Scope"];
  const comparisons = aspects.map((aspect) => ({
    aspect,
    values: docSummaries.map((d) => {
      let value;
      switch (aspect) {
        case "Methodology":   value = d.methodology; break;
        case "Key Findings":  value = (d.keyFindings[0] || "Not identified").slice(0, 150); break;
        case "Limitations":   value = (d.limitations || "Not identified").slice(0, 150); break;
        case "Sample / Scope": value = `${docs.find((x) => x.filename === d.filename)?.pages || "?"} pages`; break;
      }
      return { document: d.filename, value: value || "Not identified" };
    }),
  }));

  // Agreements 
  const agreements = detectAgreements(allTokens, docs.map((d) => d.filename));

  // Conflicts
  const conflicts = detectConflicts(docs);

  // Gaps
  const allDomainsPerDoc = docs.map((d, i) => classifyDomains(allTokens[i]));
  const allGaps = docs.flatMap((d, i) => generateGaps(d.text || "", allDomainsPerDoc[i]));
  const seenGaps = new Set();
  const gaps = allGaps.filter(({ text: t }) => {
    const key = t.slice(0, 50);
    if (seenGaps.has(key)) return false;
    seenGaps.add(key);
    return true;
  }).slice(0, 4);

  // Future directions
  const allFutures = docs.flatMap((d, i) =>
    generateFutureDirections(d.text || "", allDomainsPerDoc[i])
  );
  const seenFutures = new Set();
  const futureDirections = allFutures.filter((f) => {
    const key = f.slice(0, 50);
    if (seenFutures.has(key)) return false;
    seenFutures.add(key);
    return true;
  }).slice(0, 4);

  // Summary
  const sharedThemeLabel = themes[0]?.label || "the identified themes";
  const topKeywords      = [...new Set(allTokens.flat())]
    .map((t) => ({ t, freq: allTokens.flat().filter((x) => x === t).length }))
    .sort((a, b) => b.freq - a.freq)
    .slice(0, 4)
    .map((x) => x.t)
    .join(", ");

  const summary = docs.length === 1
    ? `This document addresses "${docSummaries[0].title}". Its primary focus is on ${sharedThemeLabel.toLowerCase()}, with key themes including ${docSummaries[0].keyThemes.slice(0, 3).join(", ")}. The methodology appears to be ${docSummaries[0].methodology.toLowerCase()}. Note: this summary was produced by rule-based extraction — AI analysis was unavailable.`
    : `This collection of ${docs.length} documents collectively engages with ${sharedThemeLabel.toLowerCase()} through recurring concepts of ${topKeywords}. ${agreements[0]} ${conflicts.length ? `Noteworthy tensions exist between documents on key claims. ` : ""}Note: this synthesis was produced by rule-based extraction — AI analysis was unavailable.`;

  return {
    topicTitle:      docSummaries[0]?.title || "Literature Review",
    documentCount:   docs.length,
    documents:       docSummaries,
    summary,
    themes,
    comparisons,
    agreements,
    conflicts,
    gaps: gaps.length ? gaps : [{ severity: "Moderate", text: "Research gaps could not be automatically identified from the extracted text. Manual review is recommended." }],
    futureDirections: futureDirections.length ? futureDirections : ["Conduct further empirical studies to validate and extend current findings."],
    uploadedFiles:   docs.map((d) => ({
      filename:  d.filename,
      pages:     d.pages,
      method:    d.method,
      ocrPages:  d.ocrPages || null,
      truncated: d.truncated || false,
    })),
    fallback: true,
  };
}

// Prompt builder

/*
Build the multi-document analysis prompt.
 * @param {Array}   docs
 * @param {string}  [topic]   optional user-supplied research topic
 * @param {string}  [doi]     optional DOI or URL
 * @param {object}  [options] output preference toggles { key: boolean }
 * @returns {string}
*/
function buildUploadPrompt(docs, topic = "", doi = "", options = {}) {
  const docSections = docs
    .map((d, i) => {
      const meta = [
        `${d.pages} pages`,
        `extracted via ${d.method === "ocr" ? `OCR (${d.ocrPages || d.pages} pages processed)` : "text layer"}`,
        d.truncated ? "content truncated" : "",
      ].filter(Boolean).join(", ");
      return `--- DOCUMENT ${i + 1}: "${d.filename}" (${meta}) ---\n${d.text}\n--- END DOCUMENT ${i + 1} ---`;
    })
    .join("\n\n");

  // Build optional context lines
  const topicLine   = topic ? `\nResearch focus provided by user: "${topic}"` : "";
  const doiLine     = doi   ? `\nDOI/URL context: ${doi}` : "";

  // Translate options toggles into human-readable preferences
  const optLabels = {
    themes:    "Key themes & synthesis",
    gaps:      "Research gap analysis",
    methods:   "Methodology comparison",
    papers:    "Key papers & summaries",
    conflicts: "Conflicting findings",
    future:    "Future directions",
  };
  const activeOpts = Object.entries(options)
    .filter(([, v]) => v)
    .map(([k]) => optLabels[k] || k)
    .join(", ");
  const optsLine = activeOpts ? `\nOutput preferences: ${activeOpts}` : "";

  return `You are an expert academic research analyst. The user has uploaded ${docs.length} academic PDF document(s).${topicLine}${doiLine}${optsLine}

Analyse the documents thoroughly and return ONLY valid JSON with this exact structure:

{
  "topicTitle": "Inferred overarching topic across all documents",
  "documentCount": ${docs.length},
  "documents": [
    {
      "filename": "exact filename",
      "title": "paper title if found, else filename",
      "authors": "authors if found",
      "year": "year if found",
      "abstract": "brief summary of this document (2-3 sentences)",
      "keyThemes": ["theme1", "theme2", "theme3"],
      "methodology": "research methodology used",
      "keyFindings": ["finding1", "finding2", "finding3"],
      "limitations": "main limitations noted"
    }
  ],
  "summary": "A 3-4 sentence synthesis across all documents",
  "themes": [
    { "label": "theme name", "pct": 85, "color": "teal", "documents": ["filename1"] }
  ],
  "comparisons": [
    {
      "aspect": "what is being compared (e.g. Methodology, Sample Size, Findings)",
      "values": [
        { "document": "filename", "value": "what this doc says about this aspect" }
      ]
    }
  ],
  "agreements": ["point where documents agree 1", "point where documents agree 2"],
  "conflicts": [
    {
      "claim1": "what doc A says",
      "source1": "filename A",
      "claim2": "what doc B says",
      "source2": "filename B"
    }
  ],
  "gaps": [
    { "severity": "Critical|Moderate|Emerging", "text": "gap description" }
  ],
  "futureDirections": ["direction 1", "direction 2", "direction 3"]
}

Rules:
- theme pct values must be in descending order
- comparisons must cover: Methodology, Key Findings, Limitations, and Sample/Scope
- if only 1 document, conflicts array will be empty
- be specific and concrete — no generic filler
- if OCR text looks garbled in places, do your best to interpret it
- prioritise sections matching the user's output preferences if specified

${docSections}`;
}


router.post("/", async (req, res) => {
  const { topic, doi, options } = req.body || {};

  if (!topic?.trim()) {
    return res.status(400).json({ error: "Research topic is required." });
  }

  const selectedOpts = Object.entries(options || {})
    .filter(([, v]) => v)
    .map(([k]) => k)
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
  "papers": [{
    "rank": number, "title": string, "authors": string, "year": number,
    "venue": string, "score": number, "tag": string,
    "researchQuestion": string, "methodology": string,
    "keyFinding": string, "limitation": string, "aiNote": string,
    "relevance": { "topicAlignment": number, "methodFit": number, "recency": number, "citationWeight": number, "gapRelevance": number }
  }],
  "conflicts": [{ "claim1": string, "source1": string, "claim2": string, "source2": string }],
  "futureDirections": [string]
}

Requirements:
- papers array should contain 5-6 entries with realistic titles and venues
- theme percentages must be in descending order
- include concrete findings, not placeholders`.trim();

  try {
    const result = await callDeepSeek({ userPrompt, maxTokens: 1200 });
    return res.json(result);
  } catch (err) {
    console.error("[lit-review]", err.message);
    return res.json(buildFallback(topic));
  }
});


router.post(
  "/upload",
  (req, res, next) => {
    upload.array("files", 5)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE")
          return res.status(400).json({ error: "Each PDF must be under 20 MB." });
        if (err.code === "LIMIT_UNEXPECTED_FILE")
          return res.status(400).json({ error: "Maximum 5 PDF files allowed." });
        return res.status(400).json({ error: err.message });
      }
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  },
  async (req, res) => {
    if (!req.files?.length) {
      return res.status(400).json({ error: "At least one PDF file is required." });
    }

    // Read optional fields sent alongside the files
    const topic = (req.body.topic || "").trim();
    const doi   = (req.body.doi   || "").trim();
    let options = {};
    try {
      if (req.body.options) options = JSON.parse(req.body.options);
    } catch (_) {}

    // Extract text from all PDFs — sequential to avoid memory spikes during OCR
    const docs = [];
    for (const file of req.files) {
      try {
        const doc = await extractText(file.buffer, file.originalname);
        docs.push(doc);
      } catch (err) {
        return res.status(422).json({
          error: `Failed to process "${file.originalname}": ${err.message}`,
        });
      }
    }

    const prompt = buildUploadPrompt(docs, topic, doi, options);

    try {
      const result = await callDeepSeek({ userPrompt: prompt, maxTokens: 2000 });

      result.uploadedFiles = docs.map((d) => ({
        filename:  d.filename,
        pages:     d.pages,
        method:    d.method,
        ocrPages:  d.ocrPages || null,
        truncated: d.truncated || false,
      }));

      return res.json(result);
    } catch (err) {
      console.warn("[lit-review/upload] AI failed, using rule-based fallback:", err.message);
      return res.json(buildUploadFallback(docs));
    }
  }
);

export default router;