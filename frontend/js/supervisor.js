const API_BASE = "";

// State
let state = {
  departments:   [],    // all dept options from /filters
  researchAreas: [],    // all area options from /filters
  deptCounts:    {},    // dept -> count map from all supervisors
  areaCounts:    {},    // area -> count map from all supervisors
  selDepts:  new Set(),
  selAreas:  new Set(),
  accepting: false,
  search:    '',
  sort:      'name',
  page:      1,
  limit:     12,
  total:     0,
  viewMode:  'grid',
  currentData: [],
};

// Debounce
let debounceTimer;
function debouncedFetch() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => { state.page = 1; applyFilters(); }, 320);
}

// Boot
async function boot() {
  showSkeletons();
  await loadFilters();
  await fetchSupervisors();
}

// Load filter options from API
async function loadFilters() {
  try {
    const r = await fetch(`${API_BASE}/api/professors/filters`);
    if (!r.ok) throw new Error('Filter fetch failed');
    const { departments, researchAreas } = await r.json();
    state.departments   = departments;
    state.researchAreas = researchAreas;

    // Also fetch all supervisors once to build counts
    const all = await fetch(`${API_BASE}/api/professors?limit=1000`).then(x => x.json());
    all.data.forEach(s => {
      state.deptCounts[s.department] = (state.deptCounts[s.department] || 0) + 1;
      (s.researchAreas || []).forEach(a => {
        state.areaCounts[a] = (state.areaCounts[a] || 0) + 1;
      });
    });

    renderFilterList('deptList', departments, 'dept', state.deptCounts);
    renderFilterList('areaList', researchAreas, 'area', state.areaCounts);
  } catch (e) {
    console.warn('Could not load filters:', e.message);
    // Fallback: still show the page, just no filter options
    document.getElementById('deptList').innerHTML = '<span style="font-size:.82rem;color:var(--ink-muted)">Could not load</span>';
    document.getElementById('areaList').innerHTML = '<span style="font-size:.82rem;color:var(--ink-muted)">Could not load</span>';
  }
}

function renderFilterList(elId, items, type, counts) {
  const el = document.getElementById(elId);
  if (!items.length) { el.innerHTML = '<span style="font-size:.82rem;color:var(--ink-muted)">None available</span>'; return; }
  el.innerHTML = items.map(item => `
    <label class="filter-item" id="${type}-item-${CSS.escape(item)}">
      <input type="checkbox" value="${escAttr(item)}"
             onchange="toggleFilter('${type}','${escJs(item)}')" id="${type}-cb-${CSS.escape(item)}">
      <span style="flex:1">${escHtml(item)}</span>
      <span class="filter-badge">${counts[item] || 0}</span>
    </label>
  `).join('');
}

// Fetch supervisors
async function fetchSupervisors() {
  const params = new URLSearchParams({
    sort:  state.sort,
    page:  state.page,
    limit: state.limit,
  });
  if (state.search)   params.set('search',    state.search);
  if (state.accepting) params.set('accepting', 'true');

  /* For multi-select: send comma-joined and split on server, or send last selected
   Simple approach: send one value at a time. For multi, loop requests or extend server.
   Here we filter client-side for multi-select after fetching a broad result set.
  */

  if (state.selDepts.size === 1)  params.set('department',  [...state.selDepts][0]);
  if (state.selAreas.size === 1)  params.set('researchArea', [...state.selAreas][0]);

  try {
    const r = await fetch(`${API_BASE}/api/professors?${params}`);
    console.log('FETCHING:', `${API_BASE}/api/professors?${params}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const json = await r.json();

    // Client-side multi-filter refinement (for when >1 dept or area is selected)
    let data = json.data;
    if (state.selDepts.size > 1) {
      data = data.filter(s => state.selDepts.has(s.department));
    }
    if (state.selAreas.size > 1) {
      data = data.filter(s => (s.researchAreas || []).some(a => state.selAreas.has(a)));
    }

    state.currentData = data;
    state.total       = state.selDepts.size > 1 || state.selAreas.size > 1 ? data.length : json.total;
    hideError();
    renderCards(data);
    renderPagination();
    updateStats();
    updateActiveChips();
  } catch (e) {
    showError('Could not reach the supervisors API. Make sure the server is running at ' + API_BASE);
    renderFallback();
  }
}

// Render cards
function renderCards(data) {
  const grid = document.getElementById('cardGrid');
  grid.className = state.viewMode === 'list' ? 'list-view' : '';

  if (!data.length) {
    grid.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🔍</div>
      <div class="empty-title">No supervisors found</div>
      <div class="empty-sub">Try adjusting your filters or search terms</div>
    </div>`;
    return;
  }

  grid.innerHTML = data.map((s, i) => supervisorCard(s, i)).join('');
}

function supervisorCard(s, i) {
  const initials = s.name.split(' ').map(w => w[0]).slice(1, 3).join('').toUpperCase();
  const avatarColors = ['#d4a853','#5b8ec9','#6aab7a','#c46a6a','#8b7ab8','#d4856a'];
  const avatarBg = avatarColors[Math.abs(s.name.charCodeAt(0) + s.name.charCodeAt(2)) % avatarColors.length];

  const avatarHtml = s.photoUrl
    ? `<div class="sup-avatar"><img src="${escAttr(s.photoUrl)}" alt="${escAttr(s.name)}" onerror="this.parentElement.innerHTML='${initials}'"></div>`
    : `<div class="sup-avatar" style="background:${avatarBg};color:white;border-color:${avatarBg}">${initials}</div>`;

  const areaTagsHtml = (s.researchAreas || []).slice(0, 3).map(a =>
    `<span class="area-tag" onclick="filterByArea(event,'${escJs(a)}')">${escHtml(a)}</span>`
  ).join('') + (s.researchAreas && s.researchAreas.length > 3 ?
    `<span class="area-tag" style="background:var(--cream-dark);color:var(--ink-muted);border-color:var(--cream-border)">+${s.researchAreas.length - 3}</span>` : '');

  const statusHtml = s.acceptingStudents
    ? `<span class="status-pill open"><span class="status-dot"></span>Open</span>`
    : `<span class="status-pill closed"><span class="status-dot"></span>Closed</span>`;

  const slotsText = s.acceptingStudents && s.availableSlots
    ? ` · ${s.availableSlots} slot${s.availableSlots !== 1 ? 's' : ''}` : '';

  return `
  <article class="sup-card" style="animation-delay:${i * 45}ms" data-id="${s._id}">
    <div class="sup-header">
      ${avatarHtml}
      <div class="sup-name-block">
        <div class="sup-name">${escHtml(s.name)}</div>
        <div class="sup-dept">${escHtml(s.department)}</div>
        ${s.faculty ? `<div class="sup-faculty">${escHtml(s.faculty)}</div>` : ''}
      </div>
      <div class="sup-status">${statusHtml}</div>
    </div>

    ${s.researchAreas && s.researchAreas.length ? `<div class="sup-areas">${areaTagsHtml}</div>` : ''}

    <div class="sup-contact">
      ${s.email ? `
      <div class="contact-row">
        <svg class="contact-icon" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        <a href="mailto:${escAttr(s.email)}">${escHtml(s.email)}</a>
      </div>` : ''}
    </div>

    <div class="sup-card-actions">
      <button class="action-btn action-btn-primary" href="${escAttr(s.profileUrl)}" >
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>
        View Profile
      </button>
      ${s.email ? `<a class="action-btn action-btn-secondary" href="mailto:${escAttr(s.email)}">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        Contact
      </a>` : ''}
    </div>
  </article>`;
}

function openProfile(jsonStr) {
  const s = JSON.parse(jsonStr);
  const initials = s.name.split(' ').map(w => w[0]).slice(1, 3).join('').toUpperCase();
  const avatarColors = ['#d4a853','#5b8ec9','#6aab7a','#c46a6a','#8b7ab8','#d4856a'];
  const avatarBg = avatarColors[Math.abs(s.name.charCodeAt(0) + s.name.charCodeAt(2)) % avatarColors.length];

  const avatarHtml = s.photoUrl
    ? `<div class="modal-avatar-lg"><img src="${escAttr(s.photoUrl)}" alt="${escAttr(s.name)}"></div>`
    : `<div class="modal-avatar-lg" style="background:${avatarBg};color:white;border-color:rgba(255,255,255,.2)">${initials}</div>`;

  const slotsStr = s.acceptingStudents
    ? `<span class="modal-slots open">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        Accepting students${s.availableSlots ? ` · ${s.availableSlots} open slot${s.availableSlots !== 1 ? 's' : ''}` : ''}
       </span>`
    : `<span class="modal-slots closed">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        Not accepting students
       </span>`;

  document.getElementById('modalContent').innerHTML = `
    <div class="modal-top">
      <button class="modal-close" onclick="document.getElementById('profileModal').classList.remove('open')">✕</button>
      ${avatarHtml}
      <div class="modal-name">${escHtml(s.name)}</div>
      <div class="modal-dept">${escHtml(s.department)}</div>
    </div>
    <div class="modal-body">
      <div>${slotsStr}</div>

      ${s.researchAreas && s.researchAreas.length ? `
      <div class="modal-section-title">Research Areas</div>
      <div class="modal-tags">${s.researchAreas.map(a => `<span class="modal-tag">${escHtml(a)}</span>`).join('')}</div>
      ` : ''}

      <div class="modal-section-title">Contact</div>
      ${s.email ? `<div class="modal-contact-row">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        <a href="mailto:${escAttr(s.email)}">${escHtml(s.email)}</a>
      </div>` : ''}
      
    </div>
    <div class="modal-footer">
      ${s.email ? `<a class="modal-btn modal-btn-primary" href="mailto:${escAttr(s.email)}">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        Send Email
      </a>` : ''}
      ${s.profileUrl ? `<a class="modal-btn modal-btn-secondary" href="${escAttr(s.profileUrl)}" target="_blank">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        Full Profile
      </a>` : ''}
    </div>
  `;
  document.getElementById('profileModal').classList.add('open');
}

function closeModal(e) {
  if (e.target === document.getElementById('profileModal')) {
    document.getElementById('profileModal').classList.remove('open');
  }
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.getElementById('profileModal').classList.remove('open');
});

// Filters
function toggleFilter(type, value) {
  const set = type === 'dept' ? state.selDepts : state.selAreas;
  set.has(value) ? set.delete(value) : set.add(value);
  state.page = 1;
  applyFilters();
}

function filterByArea(e, area) {
  e.stopPropagation();
  const cb = document.getElementById(`area-cb-${CSS.escape(area)}`);
  if (cb) { cb.checked = true; }
  state.selAreas.add(area);
  state.page = 1;
  applyFilters();
  document.getElementById('areaList').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearFilter(type) {
  if (type === 'dept') {
    state.selDepts.clear();
    document.querySelectorAll('#deptList input[type=checkbox]').forEach(cb => cb.checked = false);
  } else {
    state.selAreas.clear();
    document.querySelectorAll('#areaList input[type=checkbox]').forEach(cb => cb.checked = false);
  }
  state.page = 1;
  applyFilters();
}

function applyFilters() {
  state.search   = document.getElementById('heroSearch').value.trim();
  state.accepting = document.getElementById('acceptingToggle').checked;
  state.sort     = document.getElementById('sortSelect').value;
  fetchSupervisors();
}

function updateActiveChips() {
  const all = [...state.selDepts].map(d => ({ type: 'dept', val: d }))
            .concat([...state.selAreas].map(a => ({ type: 'area', val: a })));

  const container = document.getElementById('activeFilters');
  if (!all.length) { container.style.display = 'none'; return; }
  container.style.display = 'flex';
  container.innerHTML = all.map(f => `
    <span class="active-chip" onclick="removeChip('${f.type}','${escJs(f.val)}')">
      ${escHtml(f.val)}
      <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </span>
  `).join('');

  // Mobile badge
  const badge = document.getElementById('filterCountBadge');
  badge.textContent = all.length;
  badge.style.display = all.length ? 'inline' : 'none';
}

function removeChip(type, val) {
  if (type === 'dept') {
    state.selDepts.delete(val);
    const cb = document.getElementById(`dept-cb-${CSS.escape(val)}`);
    if (cb) cb.checked = false;
  } else {
    state.selAreas.delete(val);
    const cb = document.getElementById(`area-cb-${CSS.escape(val)}`);
    if (cb) cb.checked = false;
  }
  state.page = 1;
  applyFilters();
}

// Pagination
function renderPagination() {
  const totalPages = Math.ceil(state.total / state.limit);
  const el = document.getElementById('pagination');
  if (totalPages <= 1) { el.innerHTML = ''; return; }

  let html = `<button class="page-btn" ${state.page === 1 ? 'disabled' : ''} onclick="goPage(${state.page - 1})">‹</button>`;
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - state.page) <= 1) {
      html += `<button class="page-btn ${p === state.page ? 'active' : ''}" onclick="goPage(${p})">${p}</button>`;
    } else if (Math.abs(p - state.page) === 2) {
      html += `<button class="page-btn" style="border:none;cursor:default">…</button>`;
    }
  }
  html += `<button class="page-btn" ${state.page === totalPages ? 'disabled' : ''} onclick="goPage(${state.page + 1})">›</button>`;
  el.innerHTML = html;
}

function goPage(p) {
  state.page = p;
  fetchSupervisors();
  document.querySelector('.layout').scrollIntoView({ behavior: 'smooth' });
}

// Helpers
function updateStats() {
  const start = (state.page - 1) * state.limit + 1;
  const end   = Math.min(state.page * state.limit, state.total);
  document.getElementById('statsText').innerHTML =
    state.total === 0
      ? 'No supervisors found'
      : `Showing <strong>${start}–${end}</strong> of <strong>${state.total}</strong> supervisor${state.total !== 1 ? 's' : ''}`;
}

function showSkeletons() {
  const grid = document.getElementById('cardGrid');
  grid.innerHTML = Array(6).fill(0).map(() => `
    <div class="skeleton">
      <div style="display:flex;gap:1rem;margin-bottom:.8rem">
        <div class="skel-circle"></div>
        <div style="flex:1"><div class="skel-line w60"></div><div class="skel-line w40"></div></div>
      </div>
      <div class="skel-line w80"></div><div class="skel-line w100"></div><div class="skel-line w60"></div>
    </div>`).join('');
}

function renderFallback() {
  // Demo data shown when API is unreachable
  const demo = [
    { _id:'1', name:'Dr. Amara Osei-Bonsu', title:'Dr.', department:'Computer Science', faculty:'Science & Engineering', researchAreas:['Machine Learning','NLP','AI Ethics'], email:'a.osei-bonsu@luminary.edu', phone:'+1 (555) 201-4421', officeLocation:'Turing Hall, Room 314', bio:'Researches fairness and interpretability in large language models with a focus on low-resource African languages.', acceptingStudents:true, availableSlots:2 },
    { _id:'2', name:'Prof. Ingrid Hallström', title:'Prof.', department:'Biology', faculty:'Life Sciences', researchAreas:['CRISPR Gene Editing','Genomics','Developmental Biology'], email:'i.hallstrom@luminary.edu', phone:'+1 (555) 202-9934', officeLocation:'Watson Building, Room 207', bio:'Leading work on CRISPR-based therapies for rare genetic disorders.', acceptingStudents:true, availableSlots:1 },
    { _id:'3', name:'Assoc. Prof. Marco Delgado', title:'Assoc. Prof.', department:'Economics', faculty:'Social Sciences', researchAreas:['Behavioral Economics','Development Economics','Public Policy'], email:'m.delgado@luminary.edu', officeLocation:'Keynes Building, Room 112', bio:'Studies the behavioral underpinnings of household decision-making in emerging markets.', acceptingStudents:false, availableSlots:0 },
    { _id:'4', name:'Dr. Priya Nair', title:'Dr.', department:'Computer Science', faculty:'Science & Engineering', researchAreas:['Computer Vision','Robotics','HCI'], email:'p.nair@luminary.edu', officeLocation:'Turing Hall, Room 501', bio:'Develops visual perception systems for autonomous robots.', acceptingStudents:true, availableSlots:3 },
    { _id:'5', name:'Prof. James Kirchoff', title:'Prof.', department:'Physics', faculty:'Science & Engineering', researchAreas:['Quantum Computing','Condensed Matter Physics'], email:'j.kirchoff@luminary.edu', phone:'+1 (555) 205-3380', officeLocation:'Bohr Hall, Room 820', bio:'Investigates topological phases of matter and their applications to quantum computation.', acceptingStudents:true, availableSlots:2 },
    { _id:'6', name:'Dr. Selin Çelik', title:'Dr.', department:'Psychology', faculty:'Social Sciences', researchAreas:['Cognitive Neuroscience','Memory & Learning','Sleep Research'], email:'s.celik@luminary.edu', officeLocation:'James Building, Room 305', bio:'Studies how sleep consolidates episodic memory, with implications for learning disorders.', acceptingStudents:true, availableSlots:1 },
  ];
  state.total = demo.length;
  state.currentData = demo;
  renderCards(demo);
  updateStats();
  updateActiveChips();
}

function showError(msg) {
  const el = document.getElementById('errorBanner');
  el.textContent = '⚠ ' + msg;
  el.classList.add('show');
}
function hideError() {
  document.getElementById('errorBanner').classList.remove('show');
}

function setView(mode) {
  state.viewMode = mode;
  document.getElementById('cardGrid').className = mode === 'list' ? 'list-view' : '';
  document.getElementById('gridViewBtn').classList.toggle('active', mode === 'grid');
  document.getElementById('listViewBtn').classList.toggle('active', mode === 'list');
  renderCards(state.currentData);
}

function openMobileFilters() {
  document.getElementById('sidebar').classList.add('mobile-open');
  document.getElementById('mobileFilterClose').style.display = 'block';
}
function closeMobileFilters() {
  document.getElementById('sidebar').classList.remove('mobile-open');
}

function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }
function escAttr(s) { return String(s||'').replace(/"/g,'&quot;').replace(/'/g,'&#39;') }
function escJs(s)   { return String(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'\\"').replace(/\n/g,'\\n') }
