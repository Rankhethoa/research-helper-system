// Pagination State 
let currentQuery  = "";
let currentPage   = 1;
let totalPages    = 1;
let totalResults  = 0;
let isLoading     = false;
const PER_PAGE    = 10;

// Filter State 
const filterState = {
  searchField:    "",        // "" | "title" | "abstract" | "author"
  yearFrom:       null,
  yearTo:         null,
  openAccessOnly: false,
  subjects:       new Set(),
  pubTypes:       new Set(),
  sort:           "relevance",
};

const API_BASE = "";   

// Search entry point 
async function doSearch(resetPage = true) {
  
  if (isLoading) return;
  const query = document.getElementById("searchInput").value.trim();
 
  /* Allow filter-only searches (subject/pubType/openAccess chips clicked with no new query typed) by falling back 
  to the last used query.
  Only block if there is genuinely nothing to search with at all.
  */
  const hasActiveFilters =
  filterState.subjects.size > 0   ||
  filterState.pubTypes.size > 0   ||
  filterState.openAccessOnly      ||
  !!filterState.yearFrom          ||
  !!filterState.yearTo;

  if (resetPage) {
    currentPage = 1;
    if (query) currentQuery = query;
  }
  const effectiveQuery = query || currentQuery || "*";
  if (!effectiveQuery && !hasActiveFilters) return;


  isLoading = true;
  showLoadingState();
 
  try {
    const res = await fetch(`${API_BASE}/api/search`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query:          effectiveQuery,
        page:           currentPage,
        perPage:        PER_PAGE,
        searchField:    filterState.searchField,
        yearFrom:       filterState.yearFrom,
        yearTo:         filterState.yearTo,
        openAccessOnly: filterState.openAccessOnly,
        subjects:       [...filterState.subjects],
        pubTypes:       [...filterState.pubTypes],
        sort:           filterState.sort,
      }),
    });
 
    if (!res.ok) throw new Error(`Server error ${res.status}`);
 
    const { papers, page, totalResults: total, totalPages: pages, subjectCounts, typeCounts } = await res.json();
 
    currentPage  = page;
    totalResults = total;
    totalPages   = pages;
 
    renderResults(papers, effectiveQuery);
    renderPagination();
    updateSidebarCounts(subjectCounts, typeCounts);
    updateActiveChipsSummary();
 
  } catch (err) {
    console.error(err);
    document.getElementById("results").innerHTML =
      `<p style="color:red">⚠ ${err.message}</p>`;
  }
 
  isLoading = false;
}

/* Filter chips (search-field row) 
 Maps every chip label to the filterState change it should make.
 Called from onclick="toggleChip(this)" in the HTML.
*/
function toggleChip(el) {
  const label = el.textContent.trim();

  // Search-field chips (mutually exclusive) 
  const fieldMap = {
    "All Fields":  "",
    "Title Only":  "title",
    "Author":      "author",
    "Abstract":    "abstract",
  };

  if (label in fieldMap) {
    document.querySelectorAll(".search-filters .filter-chip").forEach(c => c.classList.remove("active"));
    el.classList.add("active");
    filterState.searchField = fieldMap[label];
    doSearch(true);
    return;
  }

  // Since 2020 (toggle) 
  if (label === "Since 2020") {
    el.classList.toggle("active");
    filterState.yearFrom = el.classList.contains("active") ? 2020 : null;
    doSearch(true);
    return;
  }

  // Open Access (toggle)
  if (label === "Open Access") {
    el.classList.toggle("active");
    filterState.openAccessOnly = el.classList.contains("active");
    doSearch(true);
    return;
  }
}

// Sort select 
function handleSortChange(el) {
  const val = el.value;
  if      (val.includes("Date")) filterState.sort = "date";
  else if (val.includes("Cit"))  filterState.sort = "citations";
  else                           filterState.sort = "relevance";
  doSearch(true);
}

// Year range inputs
function handleYearChange() {
  const inputs = document.querySelectorAll(".year-input");
  filterState.yearFrom = parseInt(inputs[0].value) || null;
  filterState.yearTo   = parseInt(inputs[1].value) || null;
  doSearch(true);
}

// Sidebar subject / type filters
function toggleSubject(label, el) {
  if (el.classList.contains("active")) {
    filterState.subjects.delete(label);
    el.classList.remove("active");
  } else {
    filterState.subjects.add(label);
    el.classList.add("active");
  }
  doSearch(true);
}

function togglePubType(label, el) {
  if (el.classList.contains("active")) {
    filterState.pubTypes.delete(label);
    el.classList.remove("active");
  } else {
    filterState.pubTypes.add(label);
    el.classList.add("active");
  }
  doSearch(true);
}

// Visual summary of active filters
function updateActiveChipsSummary() {
  const sinceChip = document.querySelector('.search-filters .filter-chip:not([data-field])');
} 

// Update sidebar counts from API facets
function updateSidebarCounts(subjectCounts = {}, typeCounts = {}) {
  document.querySelectorAll(".sidebar-item[data-subject]").forEach(item => {
    const label = item.dataset.subject;
    const count = subjectCounts[label];
    const badge = item.querySelector(".sitem-count");
    if (badge) badge.textContent = count != null ? Number(count).toLocaleString() : "—";
  });

  const typeKeyMap = {
    "Journal Article":  "journal-article",
    "Conference Paper": "proceedings-article",
    "Preprint":         "preprint",
    "Thesis":           "dissertation",
    "Book Chapter":     "book-chapter",
  };
  document.querySelectorAll(".sidebar-item[data-pubtype]").forEach(item => {
    const label = item.dataset.pubtype;
    const key   = typeKeyMap[label];
    const count = typeCounts[key] ?? typeCounts[label];
    const badge = item.querySelector(".sitem-count");
    if (badge) badge.textContent = count != null ? Number(count).toLocaleString() : "—";
  });
}

// Render results 
function renderResults(papers, query) {
  const container = document.getElementById("results");
  container.innerHTML = "";

  document.querySelector(".results-meta").innerHTML =
    `About <strong>${totalResults.toLocaleString()}</strong> results for <strong>"${query}"</strong>` +
    ` — page <strong>${currentPage}</strong> of <strong>${totalPages}</strong>`;

  if (!papers.length) {
    container.innerHTML = `<p>No results found. Try different keywords or remove some filters.</p>`;
    return;
  }

  window.currentResults = window.currentResults || [];

  papers.forEach((p, i) => {
    const globalIndex = (currentPage - 1) * PER_PAGE + i;
    window.currentResults[globalIndex] = p;

    const authStr =
      p.authors.slice(0, 3).map(a => `<a href="#">${a}</a>`).join(", ") +
      (p.authors.length > 3 ? ", …" : "");
    
      const typeLabel = {
        "dissertation":        "Thesis",
        "article":             "Journal Article",
        "proceedings-article": "Conference Paper",
        "preprint":            "Preprint",
        "book":                "Book",
        "book-chapter":        "Book Chapter",
        "review":              "Review",
        "dataset":             "Dataset",
        "report":              "Report",
      }[p.type] || p.type || "Unknown";
      
    const card = document.createElement("article");
    card.className = "paper-card";
    card.innerHTML = `
    <a class="paper-title" href="${p.doi ? "https://doi.org/" + p.doi : "#"}" target="_blank">${p.title}</a>
    <div class="paper-authors">${authStr || "Unknown authors"}</div>
    <div class="paper-venue">
      <span class="pub-type-badge">${typeLabel}</span>
      <span class="journal">${p.venue}</span> · ${p.year}
      ${p.openAccess ? ' · <span class="open-access-badge">Open Access</span>' : ""}
    </div>
      <p class="paper-abstract">${p.abstract}</p>
      <div class="paper-actions">
        ${p.hasPdf ? `<a class="action-link pdf" href="${p.pdfUrl}" target="_blank">📄 PDF</a>` : ""}
        <a class="action-link cite" href="#" onclick="openCite(event, ${globalIndex})">✦ Cite</a>
        <span class="cite-count">
          Cited by <span class="cite-badge">${p.citations.toLocaleString()}</span>
        </span>
      </div>
    `;
    
    container.appendChild(card);
  });
}

// Pagination
function renderPagination() {
  const el = document.querySelector(".pagination");
  if (!el) return;
  el.innerHTML = "";
  if (totalPages <= 1) return;

  const addBtn = (label, page, isActive = false, isDisabled = false) => {
    const btn = document.createElement("button");
    btn.className = "page-btn" + (isActive ? " active" : "") + (isDisabled ? " disabled" : "");
    btn.textContent = label;
    btn.disabled = isDisabled;
    if (!isDisabled) btn.onclick = () => goToPage(page);
    el.appendChild(btn);
  };

  addBtn("←", currentPage - 1, false, currentPage === 1);
  buildPageRange(currentPage, totalPages).forEach(p => {
    if (p === "…") {
      const dots = document.createElement("button");
      dots.className = "page-btn dots";
      dots.textContent = "…";
      dots.disabled = true;
      el.appendChild(dots);
    } else {
      addBtn(p, p, p === currentPage);
    }
  });
  addBtn("→", currentPage + 1, false, currentPage === totalPages);
}

function goToPage(page) {
  if (page < 1 || page > totalPages || page === currentPage) return;
  currentPage = page;
  doSearch(false);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function buildPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total]);
  for (let i = current - 2; i <= current + 2; i++) {
    if (i > 0 && i <= total) pages.add(i);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const result = [];
  sorted.forEach((p, idx) => {
    if (idx > 0 && p - sorted[idx - 1] > 1) result.push("…");
    result.push(p);
  });
  return result;
}

// Loading state
function showLoadingState() {
  document.getElementById("results").innerHTML =
    `<p style="opacity:.5">Searching…</p>`;
}

// Cite modal
let activePaper = null;
let activeFmt   = "apa";

const citeFormats = {
  apa:     p => `${p.authors[0]?.split(" ").pop() ?? "Unknown"}, ${p.year}. ${p.title}. <em>${p.venue}</em>.`,
  mla:     p => `${p.authors[0] ?? "Unknown"}, et al. "${p.title}." <em>${p.venue}</em>, ${p.year}.`,
  chicago: p => `${p.authors[0] ?? "Unknown"}. "${p.title}." <em>${p.venue}</em> (${p.year}).`,
  bibtex:  p => `@article{ref,\n  author={${p.authors.join(" and ")}},\n  title={${p.title}},\n  journal={${p.venue}},\n  year={${p.year}}\n}`,
  ris:     p => `TY  - JOUR\nAU  - ${p.authors[0] ?? "Unknown"}\nTI  - ${p.title}\nJO  - ${p.venue}\nPY  - ${p.year}\nER  -`,
};

function openCite(e, index) {
  e.preventDefault();
  activePaper = window.currentResults[index];
  if (!activePaper) return;
  document.getElementById("citeModal").style.display = "flex";
  updateCite();
}
function updateCite() {
  document.getElementById("citeText").innerHTML = citeFormats[activeFmt](activePaper);
}
function closeCite() {
  document.getElementById("citeModal").style.display = "none";
}
function setCiteFormat(el, fmt) {
  document.querySelectorAll(".cite-tab").forEach(t => t.classList.remove("active"));
  el.classList.add("active");
  activeFmt = fmt;
  updateCite();
}
function copyCite() {
  navigator.clipboard.writeText(document.getElementById("citeText").innerText);
}

// Mobile drawer
function toggleDrawer() {
  document.getElementById("drawer").classList.toggle("open");
  document.getElementById("drawerOverlay").classList.toggle("show");
}
function closeDrawer() {
  document.getElementById("drawer").classList.remove("open");
  document.getElementById("drawerOverlay").classList.remove("show");
}

// Boot
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("searchInput");

  // Enter key triggers search — no auto-search on keystroke
  if (input) {
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") doSearch(true);
    });
  }

  const sortEl = document.querySelector(".sort-select");
  if (sortEl) sortEl.addEventListener("change", () => handleSortChange(sortEl));

  document.querySelectorAll(".year-input").forEach(el => {
    el.addEventListener("change", handleYearChange);
  });

  // Close cite modal on backdrop click
  const modal = document.getElementById("citeModal");
  if (modal) modal.addEventListener("click", e => { if (e.target === modal) closeCite(); });

  // Close drawer on Escape
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeDrawer(); });

});