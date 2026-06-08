const API_BASE = "";
const MAX_CHARS = 2000;

let sessionId    = null;
let isStreaming  = false;
let messageCount = 0;

const STARTERS = [
  { icon: "🔍", text: "How do I find peer-reviewed articles on a specific topic?" },
  { icon: "📝", text: "Help me write a strong research question" },
  { icon: "📚", text: "What's the difference between APA and Harvard referencing?" },
  { icon: "🎓", text: "How do I approach a potential PhD supervisor?" },
  { icon: "🔬", text: "What research methodology suits my project?" },
  { icon: "📊", text: "How do I structure a literature review?" },
  { icon: "💡", text: "Generate a research topic in my field" },
  { icon: "🌐", text: "Where can I find open-access papers?" },
  { icon: "😰", text: "I'm feeling overwhelmed by my research — help" },
  { icon: "✍️", text: "How do I avoid plagiarism in my writing?" },
  { icon: "📈", text: "What is a citation impact score?" },
  { icon: "🗂️", text: "How do I find a research peer?" },
];

//  Boot  
renderStarters();
initSession();

function renderStarters() {
  const list = document.getElementById("starterList");
  list.innerHTML = STARTERS.map(s => `
    <button class="starter-btn" onclick="sendStarter('${encodeURIComponent(s.text)}')">
      <span class="starter-icon">${s.icon}</span>
      <span>${s.text}</span>
    </button>
  `).join("");
}

function sendStarter(text) {
  text = decodeURIComponent(text);
  const input = document.getElementById("chatInput");
  input.value = text;
  input.focus();

  input.dispatchEvent(new Event("input"));
}

//  Session init  
async function initSession() {
  setStatus("connecting", "connecting…");
  try {
    const r = await fetch(`${API_BASE}/api/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) throw new Error("bad response");
    const data = await r.json();
    sessionId = data.sessionId;
    setStatus("online", "Lumi is ready");
  } catch (e) {
    setStatus("offline", "offline");
    document.getElementById("offlineBanner").classList.add("show");
  }
}
  
function setStatus(state, label) {
  const dot = document.getElementById('statusDot');
  const txt = document.getElementById('statusLabel');
  dot.className = 'status-dot ' + (state === 'online' ? 'online' : state === 'connecting' ? 'loading' : '');
  txt.textContent = label;
}

// Input handling 
const chatInput = document.getElementById('chatInput');
const sendBtn   = document.getElementById('sendBtn');
const charCount = document.getElementById('charCount');

chatInput.addEventListener('input', () => {
  // Auto-resize textarea
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 140) + 'px';

  // Char counter
  const len = chatInput.value.length;
  charCount.textContent = `${len} / ${MAX_CHARS}`;
  charCount.className = 'char-count' + (len > 1800 ? ' near-limit' : '') + (len >= MAX_CHARS ? ' at-limit' : '');
});

chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
  
// Send Message 
async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text || isStreaming) return;
  if (!sessionId) {
    showError('Not connected to server. Please refresh the page.');
    return;
  }

  // Clear welcome state on first message
  if (messageCount === 0) {
    document.getElementById('welcomeState')?.remove();
  }
  messageCount++;

  // Render user bubble
  appendUserBubble(text);
  chatInput.value = '';
  chatInput.style.height = 'auto';
  charCount.textContent = `0 / ${MAX_CHARS}`;

  // Disable input while streaming
  isStreaming = true;
  sendBtn.disabled = true;
  setStatus('loading', 'Lumi is thinking…');

  // Show typing indicator
  const typingId = 'typing-' + Date.now();
  appendTypingIndicator(typingId);

  try {
    // POST to server — response is an SSE stream
    const response = await fetch(`${API_BASE}/api/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message: text }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Server error (${response.status})`);
    }

    // Remove typing indicator and create assistant bubble
    removeElement(typingId);
    const { bubbleId, contentEl } = appendAssistantBubble();

    // Read SSE stream
    const reader   = response.body.getReader();
    const decoder  = new TextDecoder();
    let   rawMd    = '';   // accumulates markdown text
    let   buffer   = '';   // SSE line buffer

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // incomplete line stays in buffer

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;

        let event;
        try { event = JSON.parse(jsonStr); } catch { continue; }

        if (event.type === 'token') {
          rawMd += event.content;
          // Render markdown live as tokens arrive
          contentEl.innerHTML = renderMarkdown(rawMd) + '<span class="typing-cursor"></span>';
          scrollToBottom();
        }

        if (event.type === 'done') {
          // Final render without cursor
          contentEl.innerHTML = renderMarkdown(rawMd);
          // Add timestamp
          addTimestamp(bubbleId);
          // Render suggestions
          if (event.suggestions?.length) {
            appendSuggestions(event.suggestions);
          }
          scrollToBottom();
        }

        if (event.type === 'error') {
          removeElement(bubbleId);
          showError(event.message);
        }
      }
    }

  } catch (err) {
    removeElement(typingId);
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      showError('Cannot connect to the server. Make sure chatbot-server.js is running.');
      setStatus('offline', 'offline');
      document.getElementById('offlineBanner').classList.add('show');
    } else {
      showError(err.message || 'Something went wrong. Please try again.');
    }
  } finally {
    isStreaming = false;
    sendBtn.disabled = false;
    setStatus('online', 'Lumi is ready');
    chatInput.focus();
  }
}
  
// DOM Helpers
function appendUserBubble(text) {
  const area = document.getElementById('messagesArea');
  const id   = 'msg-' + Date.now();
  const initials = 'You';
  const time = formatTime();

  const row = document.createElement('div');
  row.className = 'msg-row user';
  row.id = id;
  row.innerHTML = `
    <div>
      <div class="msg-bubble">${escHtml(text)}</div>
      <div class="msg-time">${time}</div>
    </div>
    <div class="msg-avatar user-av">You</div>
  `;
  area.appendChild(row);
  scrollToBottom();
}

function appendAssistantBubble() {
  const area = document.getElementById('messagesArea');
  const id   = 'msg-' + Date.now();

  const row = document.createElement('div');
  row.className = 'msg-row assistant';
  row.id = id;
  row.innerHTML = `
    <div class="msg-avatar lumi-av">🎓</div>
    <div>
      <div class="msg-bubble" id="${id}-content"></div>
      <div class="msg-time" id="${id}-time"></div>
    </div>
  `;
  area.appendChild(row);
  scrollToBottom();

  return { bubbleId: id, contentEl: document.getElementById(`${id}-content`) };
}

function appendTypingIndicator(id) {
  const area = document.getElementById('messagesArea');
  const row  = document.createElement('div');
  row.className = 'msg-row assistant';
  row.id = id;
  row.innerHTML = `
    <div class="msg-avatar lumi-av">🎓</div>
    <div class="msg-bubble" style="padding:.65rem .9rem">
      <div class="typing-dots">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  area.appendChild(row);
  scrollToBottom();
}
  
function appendSuggestions(suggestions) {
  const area = document.getElementById('messagesArea');
  const row  = document.createElement('div');
  row.style.paddingLeft = '46px'; // align with bubble (past avatar)
  row.innerHTML = `
    <div class="suggestions-row">
      ${suggestions.map(s => `
        <button class="suggestion-chip" onclick="sendSuggestion(${JSON.stringify(s)})">
          <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          ${escHtml(s)}
        </button>
      `).join('')}
    </div>
  `;
  area.appendChild(row);
  scrollToBottom();
}

function sendSuggestion(text) {
  document.getElementById('chatInput').value = text;
  sendMessage();
}

function addTimestamp(bubbleId) {
  const el = document.getElementById(`${bubbleId}-time`);
  if (el) el.textContent = formatTime();
}

function showError(msg) {
  const area = document.getElementById('messagesArea');
  const el   = document.createElement('div');
  el.className = 'error-msg';
  el.style.animation = 'fadeUp .3s ease';
  el.innerHTML = `
    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    ${escHtml(msg)}
  `;
  area.appendChild(el);
  scrollToBottom();
}

function removeElement(id) {
  document.getElementById(id)?.remove();
}

function scrollToBottom() {
  const area = document.getElementById('messagesArea');
  area.scrollTop = area.scrollHeight;
}
  
// Clear Chat
async function clearChat() {
  // Tell server to clear the session history
  if (sessionId) {
    fetch(`${API_BASE}/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    }).catch(() => {});
  }

  // Reset UI
  messageCount = 0;
  const area = document.getElementById('messagesArea');
  area.innerHTML = `
    <div class="welcome-state" id="welcomeState">
      <div class="welcome-orb">🎓</div>
      <h1 class="welcome-title">Hello, I'm <em>Lumi</em></h1>
      <p class="welcome-sub">Your AI academic support assistant. Ask me about research methods, finding papers, citing sources, contacting supervisors — anything scholarly.</p>
    </div>
  `;
}
  
/*
MARKDOWN RENDERER
A lightweight markdown-to-HTML converter. Handles the subset
of markdown Claude commonly produces: headings, bold, italic,
inline code, code blocks, blockquotes, ordered/unordered lists,
links, and horizontal rules.

do NOT use a full library to avoid loading external scripts.
This covers ~95% of Claude's output in practice.
*/

function renderMarkdown(md) {
  if (!md) return '';
  let html = md;

  html = html.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) =>
    `<pre><code>${escHtml(code.trim())}</code></pre>`
  );

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Horizontal rule
  html = html.replace(/^---+$/gm, '<hr>');

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // Bold + italic combined
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Inline code (after blocks)
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>'
  );

  // Unordered lists
  html = html.replace(/^[\*\-] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, m => {
    if (!m.startsWith('<ul>')) return `<ul>${m}</ul>`;
    return m;
  });
  // Collapse consecutive <ul> wrappers
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<oli>[\s\S]*?<\/oli>)/g, m => `<ol>${m.replace(/oli>/g, 'li>')}</ol>`);
  html = html.replace(/<\/ol>\s*<ol>/g, '');

  // Paragraphs — wrap lines not already inside a block element
  html = html.split('\n\n').map(block => {
    block = block.trim();
    if (!block) return '';
    if (/^<(h[1-6]|ul|ol|pre|blockquote|hr)/.test(block)) return block;
    return `<p>${block.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');

  return html;
}

// Utilities
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
  