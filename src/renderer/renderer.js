// ── DOM refs ──────────────────────────────────────────────────────────────────
const welcomeScreen = document.getElementById('welcome-screen');
const editorWorkspace = document.getElementById('editor-workspace');
const btnCreate = document.getElementById('btn-create');
const btnOpen = document.getElementById('btn-open');
const btnOpenSidebar = document.getElementById('btn-open-sidebar');
const btnSave = document.getElementById('btn-save');
const fileTreeEl = document.getElementById('file-tree');
const workspaceNameEl = document.getElementById('workspace-name');
const activeTabEl = document.getElementById('active-tab');
const codeEditor = document.getElementById('code-editor');
const previewEl = document.getElementById('preview');
const versionEl = document.getElementById('version');

// ── State ─────────────────────────────────────────────────────────────────────
let currentFile = null;
let dirty = false;

// ── Version label ─────────────────────────────────────────────────────────────
if (versionEl && window.docfoundry) {
  versionEl.textContent = `${window.docfoundry.appName} v${window.docfoundry.version}`;
}

// ── Button wiring ─────────────────────────────────────────────────────────────
btnCreate.addEventListener('click', async () => {
  const tree = await window.docfoundry.createWorkspace();
  if (tree) showWorkspace(tree);
});

btnOpen.addEventListener('click', openFolder);
btnOpenSidebar.addEventListener('click', openFolder);

btnSave.addEventListener('click', saveCurrentFile);

// Ctrl/Cmd+S save shortcut
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveCurrentFile();
  }
});

// Live preview on typing
codeEditor.addEventListener('input', () => {
  dirty = true;
  renderPreview(codeEditor.value);
});

// ── Open folder ───────────────────────────────────────────────────────────────
async function openFolder() {
  const tree = await window.docfoundry.openFolder();
  if (tree) showWorkspace(tree);
}

// ── Show workspace ────────────────────────────────────────────────────────────
function showWorkspace(tree) {
  welcomeScreen.hidden = true;
  editorWorkspace.hidden = false;
  workspaceNameEl.textContent = tree.name;
  renderFileTree(tree.children, fileTreeEl, 0);
}

// ── File tree rendering ───────────────────────────────────────────────────────
function renderFileTree(entries, container, depth) {
  container.innerHTML = '';
  for (const entry of entries) {
    if (entry.type === 'folder') {
      const folder = document.createElement('details');
      folder.className = 'tree-folder';
      if (depth === 0) folder.open = true;

      const summary = document.createElement('summary');
      summary.className = 'tree-item tree-item-folder';
      summary.style.paddingLeft = `${12 + depth * 14}px`;
      summary.textContent = entry.name;
      folder.appendChild(summary);

      const childContainer = document.createElement('div');
      renderFileTree(entry.children, childContainer, depth + 1);
      folder.appendChild(childContainer);
      container.appendChild(folder);
    } else {
      const file = document.createElement('div');
      file.className = 'tree-item tree-item-file';
      file.style.paddingLeft = `${12 + depth * 14}px`;
      file.textContent = entry.name;
      file.dataset.path = entry.path;
      file.addEventListener('click', () => openFile(entry));
      container.appendChild(file);
    }
  }
}

// ── Open file ─────────────────────────────────────────────────────────────────
async function openFile(entry) {
  if (dirty && currentFile) {
    await saveCurrentFile();
  }
  try {
    const content = await window.docfoundry.readFile(entry.path);
    currentFile = entry.path;
    activeTabEl.textContent = entry.name;
    codeEditor.value = content;
    renderPreview(content);
    dirty = false;

    // Highlight active file in tree
    document.querySelectorAll('.tree-item-file.active').forEach(el => el.classList.remove('active'));
    const match = document.querySelector(`.tree-item-file[data-path="${CSS.escape(entry.path)}"]`);
    if (match) match.classList.add('active');
  } catch (err) {
    activeTabEl.textContent = 'Error';
    codeEditor.value = `Failed to open file: ${err.message}`;
  }
}

// ── Save ──────────────────────────────────────────────────────────────────────
async function saveCurrentFile() {
  if (!currentFile) return;
  try {
    await window.docfoundry.writeFile(currentFile, codeEditor.value);
    dirty = false;
  } catch (err) {
    console.error('Save failed:', err);
  }
}

// ── Markdown preview (lightweight inline parser) ──────────────────────────────
function renderPreview(source) {
  previewEl.innerHTML = markdownToHtml(source);
}

function markdownToHtml(md) {
  if (!md) return '<p class="preview-empty">Open a Markdown file to see the preview.</p>';

  let html = escapeHtml(md);

  // Fenced code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) =>
    `<pre><code class="lang-${lang}">${code.trim()}</code></pre>`
  );

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headings
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Blockquotes
  html = html.replace(/^&gt;\s+(.+)$/gm, '<blockquote>$1</blockquote>');

  // Horizontal rules
  html = html.replace(/^---+$/gm, '<hr/>');

  // Unordered list items
  html = html.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" style="max-width:100%"/>');

  // Wrap loose lines in paragraphs
  html = html.replace(/^(?!<[hpuolbiahrd]|<li|<code|<pre|<blockquote|<hr)(.+)$/gm, '<p>$1</p>');

  return html;
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
  return text.replace(/[&<>"]/g, c => map[c]);
}
