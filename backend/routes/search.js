import { Router } from "express";
import { cacheMiddleware } from "../middleware/cache.js";
import { mapWork } from "../utils/mappers.js";
import { OPENALEX_EMAIL, CONCEPT_IDS, TYPE_MAP } from "../config/config.js";

const router = Router();

const ua = { "User-Agent": `mailto:${OPENALEX_EMAIL}` };

const OPENALEX_BASE = "https://api.openalex.org";

/*
Fetch facet counts (subject or type breakdown) for a given base URL.
Returns an empty object on any failure — facets are non-critical.
 * @param {string} baseUrl
 * @param {"concepts.id"|"type"} groupBy
 * @returns {Promise<Record<string, number>>}
*/
async function fetchFacets(baseUrl, groupBy) {
  try {
    const res  = await fetch(`${baseUrl}&group-by=${groupBy}&per-page=10`, { headers: ua });
    const data = await res.json();
    const out  = {};
    (data.group_by || []).forEach((g) => { out[g.key_display_name] = g.count; });
    return out;
  } catch (_) {
    return {};
  }
}

/*
Resolve author names → OpenAlex author IDs, then return works filtered by those IDs. 
Returns a full response payload or null if no authors found.
 * @param {URLSearchParams} params
 * @param {string}          query
 * @param {number}          perPage
 * @returns {Promise<object|null>}
*/
async function searchByAuthor(params, query, perPage) {
  const authorRes  = await fetch(
    `${OPENALEX_BASE}/authors?search=${encodeURIComponent(query)}&per-page=5&select=id,display_name`,
    { headers: ua }
  );
  const authorData = await authorRes.json();
  const authorIds  = (authorData.results || []).map((a) => a.id).filter(Boolean);

  if (!authorIds.length) return null;

  params.set("filter", `author.id:${authorIds.join("|")}`);

  const url      = `${OPENALEX_BASE}/works?${params.toString()}`;
  const response = await fetch(url, { headers: ua });

  if (!response.ok) {
    const t = await response.text();
    throw new Error(`OpenAlex author search failed (${response.status}): ${t.slice(0, 200)}`);
  }

  const data         = await response.json();
  const totalResults = data.meta?.count || 0;

  return {
    papers:        (data.results || []).map(mapWork),
    page:          parseInt(params.get("page"), 10),
    perPage,
    totalResults,
    totalPages:    Math.ceil(totalResults / perPage),
    subjectCounts: {},
    typeCounts:    {},
  };
}

/*
For title searches, OpenAlex stems words so we over-fetch up to 200
results and apply an exact-phrase client-side filter, then page manually.
 * @param {URLSearchParams} params
 * @param {string}          phrase
 * @param {number}          page
 * @param {number}          perPage
 * @param {object}          subjectCounts
 * @param {object}          typeCounts
 * @returns {Promise<object>}
*/
async function searchByTitle(params, phrase, page, perPage, subjectCounts, typeCounts) {
  const overfetchParams = new URLSearchParams(params);
  overfetchParams.set("per-page", 200);
  overfetchParams.set("page", 1);

  const res = await fetch(`${OPENALEX_BASE}/works?${overfetchParams.toString()}`, { headers: ua });

  let allFiltered = [];
  if (res.ok) {
    const data  = await res.json();
    allFiltered = (data.results || [])
      .map(mapWork)
      .filter((p) => p.title.toLowerCase().includes(phrase.toLowerCase()));
  }

  const start     = (page - 1) * perPage;
  const pageSlice = allFiltered.slice(start, start + perPage);

  return {
    papers:        pageSlice,
    page,
    perPage,
    totalResults:  allFiltered.length,
    totalPages:    Math.ceil(allFiltered.length / perPage),
    subjectCounts,
    typeCounts,
  };
}

router.post("/search", cacheMiddleware, async (req, res) => {
  const {
    query,
    page           = 1,
    perPage        = 10,
    searchField    = "",
    yearFrom,
    yearTo,
    openAccessOnly = false,
    subjects       = [],
    pubTypes       = [],
    sort           = "relevance",
  } = req.body;

  if (!query) return res.status(400).json({ error: "query is required." });

  const isWildcard = query.trim() === "*";

  try {
    const params = new URLSearchParams();
    params.set("per-page", perPage);
    params.set("page",     page);
    params.set("select", [
      "title", "authorships", "publication_year",
      "abstract_inverted_index", "primary_location",
      "cited_by_count", "open_access", "doi", "type",
    ].join(","));

    // Sort
    if (sort === "date")      params.set("sort", "publication_date:desc");
    if (sort === "citations") params.set("sort", "cited_by_count:desc");

    // Author search (separate flow)
    if (searchField === "author") {
      const result = await searchByAuthor(params, query, perPage);
      if (!result) {
        return res.json({ papers: [], page: 1, perPage, totalResults: 0, totalPages: 0, subjectCounts: {}, typeCounts: {} });
      }
      return res.json(result);
    }

    // Query routing
    if (!isWildcard) {
      if (searchField === "title") {
        const quoted = query.includes(" ") ? `"${query}"` : query;
        params.set("filter", `title.search:${quoted}`);
      } else if (searchField === "abstract") {
        params.set("filter", `abstract.search:${query}`);
      } else {
        params.set("search", query);
      }
    }

    // Additional filters
    const filters = [];
    if (openAccessOnly) filters.push("is_oa:true");
    if (yearFrom)       filters.push(`publication_year:>${Number(yearFrom) - 1}`);
    if (yearTo)         filters.push(`publication_year:<${Number(yearTo)   + 1}`);

    if (subjects.length) {
      const ids = subjects.map((s) => CONCEPT_IDS[s]).filter(Boolean);
      if (ids.length) filters.push(`concepts.id:${ids.join("|")}`);
    }
    if (pubTypes.length) {
      const types = pubTypes.map((t) => TYPE_MAP[t]).filter(Boolean);
      if (types.length) filters.push(`type:${types.join("|")}`);
    }
    if (filters.length) {
      const existing = params.get("filter");
      params.set("filter", existing ? `${existing},${filters.join(",")}` : filters.join(","));
    }

    // Facets (non-blocking)
    const facetBase = isWildcard
      ? `${OPENALEX_BASE}/works?${params.toString().replace(/&?per-page=\d+/, "").replace(/&?page=\d+/, "")}`
      : `${OPENALEX_BASE}/works?search=${encodeURIComponent(query)}`;

    const [subjectCounts, typeCounts] = await Promise.all([
      fetchFacets(facetBase, "concepts.id"),
      fetchFacets(facetBase, "type"),
    ]);

    // Title: exact-phrase post-filter
    if (searchField === "title" && query.trim()) {
      const result = await searchByTitle(params, query, page, perPage, subjectCounts, typeCounts);
      return res.json(result);
    }

    // Standard search
    const url      = `${OPENALEX_BASE}/works?${params.toString()}`;
    const response = await fetch(url, { headers: ua });

    if (!response.ok) {
      const t = await response.text();
      console.error("[search] OpenAlex error:", t);
      return res.status(response.status).json({ error: "OpenAlex request failed." });
    }

    const data         = await response.json();
    const totalResults = data.meta?.count || 0;

    return res.json({
      papers:        (data.results || []).map(mapWork),
      page,
      perPage,
      totalResults,
      totalPages:    Math.ceil(totalResults / perPage),
      subjectCounts,
      typeCounts,
    });

  } catch (err) {
    console.error("[search]", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;