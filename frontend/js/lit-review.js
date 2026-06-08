let uploadedFile = null;
let savedProjects =
  JSON.parse(localStorage.getItem('litProjects') || '[]');

/*
Two modes — determined at submit time:
PDF mode   → files selected → POST /api/lit-review/upload (multipart)
Topic mode → no files       → POST /api/lit-review        (JSON)
*/

// State 
let selectedFiles = [];
let isLoading     = false;
let lastResult    = null;

// Toggle Preferences 
function toggleOpt(card) {
  const pill = card.querySelector(".toggle-pill");
  const isOn = card.classList.toggle("on");
  pill.classList.toggle("on", isOn);
}

function getOptions() {
  const opts = {};
  document.querySelectorAll(".toggle-card").forEach((card) => {
    opts[card.dataset.key] = card.classList.contains("on");
  });
  return opts;
}

// File handling 
const dropZone  = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  addFiles([...e.dataTransfer.files]);
});
fileInput.addEventListener("change", () => {
  addFiles([...fileInput.files]);
  fileInput.value = "";
});

function addFiles(incoming) {
  const pdfs = incoming.filter((f) => f.type === "application/pdf");
  if (pdfs.length < incoming.length) {
    showError(`${incoming.length - pdfs.length} file(s) skipped — only PDFs are accepted.`);
  }
  const combined = [...selectedFiles, ...pdfs].slice(0, 5);
  selectedFiles  = combined.filter(
    (f, i, arr) => arr.findIndex((x) => x.name === f.name && x.size === f.size) === i
  );
  renderFileList();
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  renderFileList();
}

function renderFileList() {
  const list = document.getElementById("fileList");
  list.innerHTML = selectedFiles
    .map((f, i) => `
      <div class="file-chip">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
        </svg>
        <span class="file-chip-name">${escHtml(f.name)}</span>
        <span class="file-chip-size">${formatBytes(f.size)}</span>
        <button class="file-chip-remove" onclick="removeFile(${i})" title="Remove">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>`)
    .join("");
}


async function generateReview() {
  if (isLoading) return;

  const topic   = (document.getElementById("topicInput")?.value || "").trim();
  const doi     = (document.getElementById("doiInput")?.value   || "").trim();
  const options = getOptions();

  if (!topic && !selectedFiles.length) {
    showError("Please enter a research topic or upload at least one PDF.");
    return;
  }

  startLoading();
  clearError();

  try {
    let data;

    if (selectedFiles.length) {
      // PDF mode
      const totalMb = selectedFiles.reduce((s, f) => s + f.size, 0) / (1024 * 1024);
      setStatus(totalMb > 10
        ? "Uploading — scanned pages may take a moment to extract…"
        : "Uploading PDFs…"
      );

      const formData = new FormData();
      selectedFiles.forEach((f) => formData.append("files", f));
      if (topic) formData.append("topic",   topic);
      if (doi)   formData.append("doi",     doi);
      formData.append("options", JSON.stringify(options));

      setStatus("Extracting text from PDFs…");
      const res = await fetch("/api/lit-review/upload", { method: "POST", body: formData });

      setStatus("Analysing with AI…");
      data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);

    } else {
      // Topic mode 
      setStatus("Consulting the literature…");
      const res = await fetch("/api/lit-review", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ topic, doi, options }),
      });

      setStatus("Building your review…");
      data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
    }

    lastResult = data;
    renderResults(data, !!selectedFiles.length);

  } catch (err) {
    showError(err.message);
    showInputSection();
  } finally {
    stopLoading();
  }
}

// Render Results 
function renderResults(data, isPdfMode) {
  // Switch sections
  hideInputSection();
  document.getElementById("resultSection").classList.remove("hidden");

  // Read active toggles for conditional sections
  const opts = getOptions();

  // Fallback notice
  const notice = document.getElementById("fallbackNotice");
  notice.style.display = data.fallback ? "flex" : "none";

  // Recap bar
  const recapBar = document.getElementById("recapBar");
  recapBar.innerHTML = `
    <span class="recap-topic">${escHtml(data.topicTitle || "Literature Review")}</span>
    ${isPdfMode
      ? `<span class="recap-chip">${(data.uploadedFiles || []).length} PDF${(data.uploadedFiles || []).length !== 1 ? "s" : ""} analysed</span>`
      : `<span class="recap-chip">${data.paperCount || 0} papers</span>`}
    ${data.fallback ? `<span class="recap-chip recap-chip--warn">Rule-based fallback</span>` : ""}
  `;

  // Uploaded file badges (PDF mode only)
  const uploadSummary = document.getElementById("uploadSummary");
  if (isPdfMode && data.uploadedFiles?.length) {
    uploadSummary.innerHTML = data.uploadedFiles.map((f) => {
      const label = f.method === "ocr"
        ? `OCR · ${f.ocrPages || f.pages}pp scanned`
        : `text · ${f.pages}pp`;
      return `
        <div class="upload-badge" title="${f.method === "ocr" ? "Scanned PDF — OCR used" : "Text-based PDF"}">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
          </svg>
          ${escHtml(f.filename)} · ${label}${f.truncated ? " · truncated" : ""}
        </div>`;
    }).join("");
    uploadSummary.style.display = "flex";
  } else {
    uploadSummary.style.display = "none";
  }

  // Summary
  document.getElementById("summaryText").textContent = data.summary || "";
  show("secSummary");

  // Individual documents (PDF mode) 
  if (isPdfMode && data.documents?.length) {
    document.getElementById("docGrid").innerHTML = data.documents.map((d) => `
      <div class="doc-card">
        <div class="doc-card-title">${escHtml(d.title || d.filename)}</div>
        <div class="doc-card-meta">${[d.authors, d.year].filter(Boolean).join(" · ")}</div>
        <div class="doc-card-abstract">${escHtml(d.abstract || "")}</div>
        ${d.keyThemes?.length ? `<div class="doc-tags">${d.keyThemes.map((t) => `<span class="doc-tag">${escHtml(t)}</span>`).join("")}</div>` : ""}
        ${d.methodology     ? `<div class="doc-method"><strong>Method:</strong> ${escHtml(d.methodology)}</div>` : ""}
        ${d.keyFindings?.length ? `<div class="doc-findings"><strong>Key findings:</strong><ul>${d.keyFindings.map((f) => `<li>${escHtml(f)}</li>`).join("")}</ul></div>` : ""}
      </div>`).join("");
    show("secDocs");
  } else {
    hide("secDocs");
  }

  // Themes
  const colors = ["teal", "blue", "purple", "sage", "amber", "gold"];
  if (opts.themes && data.themes?.length) {
    document.getElementById("themeList").innerHTML = data.themes.map((t, i) => `
      <div class="theme-row">
        <div class="theme-label-row">
          <span>${escHtml(t.label)}</span>
          <span class="theme-pct">${t.pct}%</span>
        </div>
        <div class="theme-bar-track">
          <div class="theme-bar-fill color-${t.color || colors[i % colors.length]}" style="width:${t.pct}%"></div>
        </div>
      </div>`).join("");
    show("secThemes");
  } else {
    hide("secThemes");
  }

  // Comparisons (PDF mode)
  if (isPdfMode && opts.methods && data.comparisons?.length) {
    const docNames = (data.documents || []).map((d) => d.filename || d.title);
    document.getElementById("compHead").innerHTML = `<tr><th>Aspect</th>${docNames.map((n) => `<th>${escHtml(n)}</th>`).join("")}</tr>`;
    document.getElementById("compBody").innerHTML = data.comparisons.map((row) => `
      <tr>
        <td class="comp-aspect">${escHtml(row.aspect)}</td>
        ${docNames.map((name) => {
          const match = (row.values || []).find((v) => v.document === name);
          return `<td>${escHtml(match?.value || "—")}</td>`;
        }).join("")}
      </tr>`).join("");
    show("secComparisons");
  } else {
    hide("secComparisons");
  }

  // Key papers (topic mode)
  if (!isPdfMode && opts.papers && data.papers?.length) {
    document.getElementById("papersList").innerHTML = data.papers.map((p) => `
      <div class="paper-card">
        <div class="paper-rank">#${p.rank}</div>
        <div class="paper-body">
          <div class="paper-title">${escHtml(p.title)}</div>
          <div class="paper-meta">${escHtml(p.authors || "")} ${p.year ? `· ${p.year}` : ""} ${p.venue ? `· ${p.venue}` : ""}</div>
          ${p.keyFinding ? `<div class="paper-finding">${escHtml(p.keyFinding)}</div>` : ""}
          ${p.tag ? `<span class="paper-tag">${escHtml(p.tag)}</span>` : ""}
        </div>
      </div>`).join("");
    show("secPapers");
  } else {
    hide("secPapers");
  }

  //  Methods (topic mode) 
  if (!isPdfMode && opts.methods && data.methods?.length) {
    document.getElementById("methodsList").innerHTML = data.methods.map((m) => `
      <div class="method-row">
        <div class="method-label-row">
          <span>${escHtml(m.label)}</span>
          <span class="method-count">${m.count}</span>
        </div>
        <div class="theme-bar-track">
          <div class="theme-bar-fill color-${m.color || "blue"}" style="width:${Math.min(m.count * 8, 100)}%"></div>
        </div>
      </div>`).join("");
    show("secMethods");
  } else {
    hide("secMethods");
  }

  // Agreements 
  if (data.agreements?.length) {
    document.getElementById("agreementList").innerHTML = data.agreements.map((a) => `
      <div class="agreement-item">
        <div class="agreement-dot"></div>
        <span>${escHtml(a)}</span>
      </div>`).join("");
    show("secAgreements");
  } else {
    hide("secAgreements");
  }

  // Conflicts
  if (opts.conflicts && data.conflicts?.length) {
    document.getElementById("conflictList").innerHTML = data.conflicts.map((c) => `
      <div class="conflict-card">
        <div class="conflict-side">
          <div class="conflict-label">${escHtml(c.source1)}</div>
          ${escHtml(c.claim1)}
        </div>
        <div class="conflict-side">
          <div class="conflict-label">${escHtml(c.source2)}</div>
          ${escHtml(c.claim2)}
        </div>
      </div>`).join("");
    show("secConflicts");
  } else {
    hide("secConflicts");
  }

  //  Gaps
  if (opts.gaps && data.gaps?.length) {
    document.getElementById("gapList").innerHTML = data.gaps.map((g) => `
      <div class="gap-item">
        <span class="gap-badge ${(g.severity || "").toLowerCase()}">${escHtml(g.severity)}</span>
        <span>${escHtml(g.text)}</span>
      </div>`).join("");
    show("secGaps");
  } else {
    hide("secGaps");
  }

  // Future directions 
  if (opts.future && data.futureDirections?.length) {
    document.getElementById("futureList").innerHTML = data.futureDirections.map((f, i) => `
      <div class="future-item">
        <span class="future-num">${String(i + 1).padStart(2, "0")}</span>
        <span>${escHtml(f)}</span>
      </div>`).join("");
    show("secFuture");
  } else {
    hide("secFuture");
  }

  // Footer meta 
  const fileCount = (data.uploadedFiles || []).length;
  const ocrCount  = (data.uploadedFiles || []).filter((f) => f.method === "ocr").length;
  const activeCount = Object.values(opts).filter(Boolean).length;
  document.getElementById("footerMeta").textContent = isPdfMode
    ? `${fileCount} doc${fileCount !== 1 ? "s" : ""} analysed${ocrCount ? ` · ${ocrCount} via OCR` : ""}${data.fallback ? " · rule-based" : " · AI"} · ${activeCount} sections`
    : `${data.paperCount || 0} papers · AI · ${activeCount} sections`;

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Footer 
async function copyReview() {
  if (!lastResult) return;
  const text = buildPlainText(lastResult);
  try {
    await navigator.clipboard.writeText(text);
  } catch (_) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  showToast("Review copied to clipboard");
}

function exportReview() {
  if (!lastResult) return;
  const text     = buildPlainText(lastResult);
  const blob     = new Blob([text], { type: "text/plain" });
  const url      = URL.createObjectURL(blob);
  const anchor   = document.createElement("a");
  const filename = (lastResult.topicTitle || "literature-review")
    .toLowerCase().replace(/\s+/g, "-").slice(0, 60) + ".txt";
  anchor.href     = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("Downloaded as .txt");
}

function saveToProject() {
  if (!lastResult) return;
  try {
    const raw      = localStorage.getItem("savedReviews");
    const existing = raw ? JSON.parse(raw) : [];
    existing.unshift({
      id:         Date.now(),
      savedAt:    new Date().toISOString(),
      topicTitle: lastResult.topicTitle || "Untitled",
      result:     lastResult,
    });
    localStorage.setItem("savedReviews", JSON.stringify(existing.slice(0, 10)));
    showToast(`Saved "${lastResult.topicTitle || "review"}" to project`);
  } catch (_) {
    showToast("Could not save — storage unavailable");
  }
}

function resetToInput() {
  selectedFiles = [];
  lastResult    = null;
  renderFileList();
  clearError();
  const topicInput = document.getElementById("topicInput");
  const doiInput   = document.getElementById("doiInput");
  if (topicInput) topicInput.value = "";
  if (doiInput)   doiInput.value   = "";
  document.getElementById("resultSection").classList.add("hidden");
  showInputSection();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Plain text builder for copy + export 
function buildPlainText(d) {
  const lines = [];
  lines.push(`LITERATURE REVIEW — ${d.topicTitle || "Untitled"}`);
  lines.push("=".repeat(60));
  if (d.summary) { lines.push("\nSYNTHESIS"); lines.push(d.summary); }

  if (d.documents?.length) {
    lines.push("\nDOCUMENTS");
    d.documents.forEach((doc, i) => {
      lines.push(`\n${i + 1}. ${doc.title || doc.filename}`);
      if (doc.authors)    lines.push(`   Authors:  ${doc.authors}`);
      if (doc.year)       lines.push(`   Year:     ${doc.year}`);
      if (doc.methodology) lines.push(`   Method:   ${doc.methodology}`);
      if (doc.abstract)   lines.push(`   Abstract: ${doc.abstract}`);
      if (doc.keyFindings?.length) {
        lines.push("   Findings:");
        doc.keyFindings.forEach((f) => lines.push(`   - ${f}`));
      }
    });
  }

  if (d.themes?.length)   { lines.push("\nKEY THEMES");        d.themes.forEach((t)   => lines.push(`  ${t.label}: ${t.pct}%`)); }
  if (d.agreements?.length) { lines.push("\nAGREEMENTS");      d.agreements.forEach((a) => lines.push(`  • ${a}`)); }
  if (d.conflicts?.length)  { lines.push("\nCONFLICTS");       d.conflicts.forEach((c)  => { lines.push(`  [${c.source1}] ${c.claim1}`); lines.push(`  [${c.source2}] ${c.claim2}`); }); }
  if (d.gaps?.length)       { lines.push("\nRESEARCH GAPS");   d.gaps.forEach((g)       => lines.push(`  [${g.severity}] ${g.text}`)); }
  if (d.futureDirections?.length) { lines.push("\nFUTURE DIRECTIONS"); d.futureDirections.forEach((f, i) => lines.push(`  ${i + 1}. ${f}`)); }

  return lines.join("\n");
}

// Section Visibility 
function show(id) { document.getElementById(id)?.classList.remove("hidden"); }
function hide(id) { document.getElementById(id)?.classList.add("hidden"); }
function hideInputSection() { document.getElementById("inputSection")?.classList.add("hidden"); }
function showInputSection()  { document.getElementById("inputSection")?.classList.remove("hidden"); }


function startLoading() {
  isLoading = true;
  hideInputSection();
  document.getElementById("loadingSection").classList.remove("hidden");
  document.getElementById("resultSection").classList.add("hidden");
}

function stopLoading() {
  isLoading = false;
  document.getElementById("loadingSection").classList.add("hidden");
}

function setStatus(msg) {
  ["loadingStatus", "loadingStatusInline"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = msg;
  });
}

// Error  
function showError(msg) {
  const box = document.getElementById("errorBox");
  if (!box) return;
  box.textContent   = msg;
  box.style.display = "block";
}

function clearError() {
  const box = document.getElementById("errorBox");
  if (box) box.style.display = "none";
}

// Toast Notifications 
function showToast(message) {
  document.getElementById("litToast")?.remove();
  const toast = document.createElement("div");
  toast.id    = "litToast";
  toast.textContent = message;
  toast.style.cssText = [
    "position:fixed", "bottom:1.5rem", "left:50%",
    "transform:translateX(-50%)",
    "background:#1a1714", "color:#fff",
    "padding:0.65rem 1.25rem", "border-radius:8px",
    "font-size:0.83rem", "z-index:9999",
    "box-shadow:0 4px 16px rgba(0,0,0,0.25)",
  ].join(";");
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Utilities 
function formatBytes(bytes) {
  if (bytes < 1024)        return bytes + " B";
  if (bytes < 1048576)     return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function escHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") generateReview();
});