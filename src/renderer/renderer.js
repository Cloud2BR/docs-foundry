// ── DOM refs ──────────────────────────────────────────────────────────────────
const welcomeScreen = document.getElementById('welcome-screen');
const editorWorkspace = document.getElementById('editor-workspace');
const btnCreate = document.getElementById('btn-create');
const btnOpen = document.getElementById('btn-open');
const btnOpenSidebar = document.getElementById('btn-open-sidebar');
const btnNewFile = document.getElementById('btn-new-file');
const btnNewFolder = document.getElementById('btn-new-folder');
const btnSave = document.getElementById('btn-save');
const fileTreeEl = document.getElementById('file-tree');
const workspaceNameEl = document.getElementById('workspace-name');
const tabsScroll = document.getElementById('tabs-scroll');
const codeEditor = document.getElementById('code-editor');
const previewEl = document.getElementById('preview');
const previewPane = document.querySelector('.pane-preview');
const linkSuggestions = document.getElementById('link-suggestions');
const versionEl = document.getElementById('version');
const sidebar = document.getElementById('sidebar');
const sidebarResize = document.getElementById('sidebar-resize');
const paneResize = document.getElementById('pane-resize');
const breadcrumbsEl = document.getElementById('breadcrumbs');
const statusFile = document.getElementById('status-file');
const statusCursor = document.getElementById('status-cursor');
const statusWords = document.getElementById('status-words');
const statusReading = document.getElementById('status-reading');
const statusAutosave = document.getElementById('status-autosave');
const statusEncoding = document.getElementById('status-encoding');
const outlinePanel = document.getElementById('outline-panel');
const outlineTree = document.getElementById('outline-tree');
const btnCloseOutline = document.getElementById('btn-close-outline');
const commandPalette = document.getElementById('command-palette');
const paletteInput = document.getElementById('palette-input');
const paletteResults = document.getElementById('palette-results');
const searchPanel = document.getElementById('search-panel');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const searchClose = document.getElementById('search-close');
const diffOverlay = document.getElementById('diff-overlay');
const diffTitle = document.getElementById('diff-title');
const diffOutput = document.getElementById('diff-output');
const diffClose = document.getElementById('diff-close');
const linkCheckOverlay = document.getElementById('link-check-overlay');
const linkCheckResults = document.getElementById('link-check-results');
const linkCheckClose = document.getElementById('link-check-close');
const findBar = document.getElementById('find-bar');
const findInput = document.getElementById('find-input');
const findCount = document.getElementById('find-count');
const findPrev = document.getElementById('find-prev');
const findNext = document.getElementById('find-next');
const findClose = document.getElementById('find-close');
const replaceRow = document.getElementById('replace-row');
const replaceInput = document.getElementById('replace-input');
const replaceOne = document.getElementById('replace-one');
const replaceAll = document.getElementById('replace-all');
const shortcutsOverlay = document.getElementById('shortcuts-overlay');
const shortcutsClose = document.getElementById('shortcuts-close');
const inputDialog = document.getElementById('input-dialog');
const inputDialogLabel = document.getElementById('input-dialog-label');
const inputDialogInput = document.getElementById('input-dialog-input');
const inputDialogOk = document.getElementById('input-dialog-ok');
const inputDialogCancel = document.getElementById('input-dialog-cancel');
const sidebarFilterInput = document.getElementById('sidebar-filter-input');

const { markdownToHtml, escapeHtml } = globalThis.DocFoundryMarkdown;
const api = window.docfoundry;

// ── State ─────────────────────────────────────────────────────────────────────
let tabs = [];             // { id, path, name, content, dirty, scrollTop, scrollLeft, selStart, selEnd }
let activeTabId = null;
let workspaceTree = null;
let workspaceRoot = null;
let autoSaveEnabled = true;
let autoSaveTimer = null;
let outlineVisible = false;
let zenMode = false;
let findMatches = [];
let findMatchIndex = -1;
let tabIdCounter = 0;
let gitStatusMap = new Map();
let brokenLinkResults = [];
let previewSyncLock = null;
let mermaidLoaderPromise = null;
let suggestionItems = [];
let suggestionIndex = 0;
let suggestionRange = null;

// ── Version label ─────────────────────────────────────────────────────────────
if (versionEl && api) {
  versionEl.textContent = `${api.appName} v${api.version}`;
}

// ── Button wiring ─────────────────────────────────────────────────────────────
btnCreate.addEventListener('click', async () => {
  const tree = await api.createWorkspace();
  if (tree) showWorkspace(tree);
});

btnOpen.addEventListener('click', doOpenFolder);
btnOpenSidebar.addEventListener('click', doOpenFolder);
btnNewFile.addEventListener('click', () => promptNewFile());
btnNewFolder.addEventListener('click', () => promptNewFolder());
btnSave.addEventListener('click', saveActiveTab);
btnCloseOutline.addEventListener('click', () => toggleOutline(false));
searchClose.addEventListener('click', () => toggleSearchPanel(false));
diffClose.addEventListener('click', () => toggleDiffOverlay(false));
linkCheckClose.addEventListener('click', () => toggleBrokenLinkOverlay(false));
findClose.addEventListener('click', () => toggleFindBar(false));
shortcutsClose.addEventListener('click', () => toggleShortcuts(false));

statusAutosave.addEventListener('click', () => {
  autoSaveEnabled = !autoSaveEnabled;
  statusAutosave.textContent = `Auto-save: ${autoSaveEnabled ? 'ON' : 'OFF'}`;
});

// ── Save-and-close flow ───────────────────────────────────────────────────────
if (api?.onRequestSaveAndClose) {
  api.onRequestSaveAndClose(async () => {
    const didSave = await saveActiveTab();
    await api.confirmSaveAndClose(didSave);
  });
}

// ── Menu events ───────────────────────────────────────────────────────────────
if (api?.onMenuEvent) {
  api.onMenuEvent('menu-open-folder', doOpenFolder);
  api.onMenuEvent('menu-new-file', () => promptNewFile());
  api.onMenuEvent('menu-save', saveActiveTab);
  api.onMenuEvent('menu-export-html', exportCurrentHtml);
  api.onMenuEvent('menu-export-pdf', exportCurrentPdf);
  api.onMenuEvent('menu-find', () => toggleFindBar(true, false));
  api.onMenuEvent('menu-replace', () => toggleFindBar(true, true));
  api.onMenuEvent('menu-command-palette', () => toggleCommandPalette(true));
  api.onMenuEvent('menu-workspace-search', () => toggleSearchPanel(true));
  api.onMenuEvent('menu-git-diff', openGitDiff);
  api.onMenuEvent('menu-check-links', () => runBrokenLinkCheck(true));
  api.onMenuEvent('menu-toggle-sidebar', () => toggleSidebar());
  api.onMenuEvent('menu-toggle-outline', () => toggleOutline());
  api.onMenuEvent('menu-zen-mode', () => toggleZenMode());
  api.onMenuEvent('menu-shortcuts', () => toggleShortcuts(true));
}

// ── File watcher ──────────────────────────────────────────────────────────────
if (api?.onWorkspaceChanged) {
  let refreshDebounce = null;
  api.onWorkspaceChanged(() => {
    clearTimeout(refreshDebounce);
    refreshDebounce = setTimeout(async () => {
      const tree = await api.refreshTree();
      if (tree) {
        workspaceTree = tree;
        renderFileTree(tree.children, fileTreeEl, 0);
        refreshGitStatus();
      }
    }, 500);
  });
}

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  const mod = e.ctrlKey || e.metaKey;

  // Ctrl+S — save
  if (mod && e.key === 's' && !e.shiftKey) {
    e.preventDefault();
    saveActiveTab();
    return;
  }

  // Ctrl+P — command palette
  if (mod && e.key === 'p' && !e.shiftKey) {
    e.preventDefault();
    toggleCommandPalette(true);
    return;
  }

  // Ctrl+Shift+F — workspace search
  if (mod && e.shiftKey && e.key === 'F') {
    e.preventDefault();
    toggleSearchPanel(true);
    return;
  }

  if (mod && e.shiftKey && e.key === 'D') {
    e.preventDefault();
    openGitDiff();
    return;
  }

  if (mod && e.shiftKey && e.key === 'L') {
    e.preventDefault();
    runBrokenLinkCheck(true);
    return;
  }

  // Ctrl+F — find
  if (mod && e.key === 'f' && !e.shiftKey) {
    e.preventDefault();
    toggleFindBar(true, false);
    return;
  }

  // Ctrl+H — replace
  if (mod && e.key === 'h') {
    e.preventDefault();
    toggleFindBar(true, true);
    return;
  }

  // Ctrl+B — toggle sidebar
  if (mod && e.key === 'b' && !e.shiftKey) {
    e.preventDefault();
    toggleSidebar();
    return;
  }

  // Ctrl+Shift+O — toggle outline
  if (mod && e.shiftKey && e.key === 'O') {
    e.preventDefault();
    toggleOutline();
    return;
  }

  // Ctrl+Shift+Z — zen mode
  if (mod && e.shiftKey && e.key === 'Z') {
    e.preventDefault();
    toggleZenMode();
    return;
  }

  // Ctrl+/ — shortcuts
  if (mod && e.key === '/') {
    e.preventDefault();
    toggleShortcuts();
    return;
  }

  // Ctrl+Shift+E — export HTML
  if (mod && e.shiftKey && e.key === 'E') {
    e.preventDefault();
    exportCurrentHtml();
    return;
  }

  if (mod && e.shiftKey && e.key === 'P') {
    e.preventDefault();
    exportCurrentPdf();
    return;
  }

  // Ctrl+N — new file
  if (mod && e.key === 'n' && !e.shiftKey) {
    e.preventDefault();
    promptNewFile();
    return;
  }

  // Ctrl+W — close tab
  if (mod && e.key === 'w' && !e.shiftKey) {
    e.preventDefault();
    if (activeTabId !== null) closeTab(activeTabId);
    return;
  }

  // Ctrl+Tab / Ctrl+Shift+Tab — cycle tabs
  if (mod && e.key === 'Tab') {
    e.preventDefault();
    cycleTabs(e.shiftKey ? -1 : 1);
    return;
  }

  // Ctrl+1-9 — go to tab
  if (mod && e.key >= '1' && e.key <= '9') {
    e.preventDefault();
    const idx = parseInt(e.key, 10) - 1;
    if (idx < tabs.length) activateTab(tabs[idx].id);
    return;
  }

  // Escape — close overlays
  if (e.key === 'Escape') {
    if (!diffOverlay.hidden) { toggleDiffOverlay(false); return; }
    if (!linkCheckOverlay.hidden) { toggleBrokenLinkOverlay(false); return; }
    if (!commandPalette.hidden) { toggleCommandPalette(false); return; }
    if (!searchPanel.hidden) { toggleSearchPanel(false); return; }
    if (!shortcutsOverlay.hidden) { toggleShortcuts(false); return; }
    if (!findBar.hidden) { toggleFindBar(false); return; }
    if (!inputDialog.hidden) { closeInputDialog(); return; }
  }
});

// ── Tab key support in editor ─────────────────────────────────────────────────
codeEditor.addEventListener('keydown', (e) => {
  if (!linkSuggestions.hidden) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveLinkSuggestion(1);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveLinkSuggestion(-1);
      return;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      applyLinkSuggestion();
      return;
    }
    if (e.key === 'Escape') {
      hideLinkSuggestions();
      return;
    }
  }

  if (e.key === 'Tab') {
    e.preventDefault();
    const start = codeEditor.selectionStart;
    const end = codeEditor.selectionEnd;
    const value = codeEditor.value;

    if (e.shiftKey) {
      // Outdent: remove leading two spaces from each selected line
      const before = value.substring(0, start);
      const lineStart = before.lastIndexOf('\n') + 1;
      const block = value.substring(lineStart, end);
      const outdented = block.replace(/^ {2}/gm, '');
      codeEditor.value = value.substring(0, lineStart) + outdented + value.substring(end);
      codeEditor.selectionStart = start - (block.length - outdented.length > 0 ? Math.min(2, start - lineStart) : 0);
      codeEditor.selectionEnd = lineStart + outdented.length;
    } else if (start !== end) {
      // Indent selected lines
      const before = value.substring(0, start);
      const lineStart = before.lastIndexOf('\n') + 1;
      const block = value.substring(lineStart, end);
      const indented = block.replace(/^/gm, '  ');
      codeEditor.value = value.substring(0, lineStart) + indented + value.substring(end);
      codeEditor.selectionStart = start + 2;
      codeEditor.selectionEnd = lineStart + indented.length;
    } else {
      // Insert two spaces at cursor
      codeEditor.value = value.substring(0, start) + '  ' + value.substring(end);
      codeEditor.selectionStart = codeEditor.selectionEnd = start + 2;
    }

    onEditorInput();
  }
});

// ── Editor input handling ─────────────────────────────────────────────────────
codeEditor.addEventListener('input', onEditorInput);
codeEditor.addEventListener('click', () => {
  updateCursorStatus();
  updateLinkSuggestions();
});
codeEditor.addEventListener('keyup', () => {
  updateCursorStatus();
  updateLinkSuggestions();
});
codeEditor.addEventListener('scroll', () => {
  const tab = getActiveTab();
  if (tab) {
    tab.scrollTop = codeEditor.scrollTop;
    tab.scrollLeft = codeEditor.scrollLeft;
  }
  syncPreviewToEditor();
});

previewPane.addEventListener('scroll', () => {
  syncEditorToPreview();
});

for (const dropTarget of [codeEditor, previewPane]) {
  dropTarget.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropTarget.classList.add('drop-target');
  });
  dropTarget.addEventListener('dragleave', () => {
    dropTarget.classList.remove('drop-target');
  });
  dropTarget.addEventListener('drop', async (event) => {
    event.preventDefault();
    dropTarget.classList.remove('drop-target');
    await handleExternalDrop(event);
  });
}

function onEditorInput() {
  const tab = getActiveTab();
  if (tab) {
    tab.content = codeEditor.value;
    setDirtyState(tab.id, true);
  }
  renderPreview(codeEditor.value);
  updateStatusBar();
  updateOutline();
  updateLinkSuggestions();
  scheduleAutoSave();
}

// ── Auto-save ─────────────────────────────────────────────────────────────────
function scheduleAutoSave() {
  clearTimeout(autoSaveTimer);
  if (!autoSaveEnabled) return;
  autoSaveTimer = setTimeout(() => {
    const tab = getActiveTab();
    if (tab && tab.dirty && tab.path) {
      saveTab(tab.id);
    }
  }, 2000);
}

// ── Open folder ───────────────────────────────────────────────────────────────
async function doOpenFolder() {
  // Save all dirty tabs before switching
  for (const tab of tabs) {
    if (tab.dirty && tab.path) {
      await saveTab(tab.id);
    }
  }
  const tree = await api.openFolder();
  if (tree) showWorkspace(tree);
}

// ── Show workspace ────────────────────────────────────────────────────────────
function showWorkspace(tree) {
  welcomeScreen.hidden = true;
  editorWorkspace.hidden = false;
  workspaceTree = tree;
  workspaceRoot = tree.root;
  tabs = [];
  activeTabId = null;
  tabIdCounter = 0;
  renderTabs();
  resetEditorState();
  workspaceNameEl.textContent = tree.name;
  renderFileTree(tree.children, fileTreeEl, 0);
  refreshGitStatus();
}

// ── Tab management ────────────────────────────────────────────────────────────
function createTab(filePath, fileName) {
  const existing = tabs.find(t => t.path === filePath);
  if (existing) {
    activateTab(existing.id);
    return existing;
  }

  const tab = {
    id: ++tabIdCounter,
    path: filePath,
    name: fileName,
    content: '',
    dirty: false,
    scrollTop: 0,
    scrollLeft: 0,
    selStart: 0,
    selEnd: 0
  };
  tabs.push(tab);
  renderTabs();
  return tab;
}

function activateTab(tabId) {
  // Save position from current active tab
  const prev = getActiveTab();
  if (prev) {
    prev.content = codeEditor.value;
    prev.scrollTop = codeEditor.scrollTop;
    prev.scrollLeft = codeEditor.scrollLeft;
    prev.selStart = codeEditor.selectionStart;
    prev.selEnd = codeEditor.selectionEnd;
  }

  activeTabId = tabId;
  const tab = getActiveTab();
  if (!tab) return;

  codeEditor.value = tab.content;
  codeEditor.scrollTop = tab.scrollTop;
  codeEditor.scrollLeft = tab.scrollLeft;
  codeEditor.selectionStart = tab.selStart;
  codeEditor.selectionEnd = tab.selEnd;

  renderPreview(tab.content);
  renderTabs();
  updateBreadcrumbs();
  updateStatusBar();
  updateOutline();
  highlightActiveFileInTree();
}

async function closeTab(tabId) {
  const tab = tabs.find(t => t.id === tabId);
  if (!tab) return;

  if (tab.dirty) {
    const didSave = await saveTab(tabId);
    if (!didSave) return;
  }

  const idx = tabs.indexOf(tab);
  tabs.splice(idx, 1);

  if (activeTabId === tabId) {
    if (tabs.length > 0) {
      const nextIdx = Math.min(idx, tabs.length - 1);
      activateTab(tabs[nextIdx].id);
    } else {
      activeTabId = null;
      resetEditorState();
    }
  }
  renderTabs();
}

function cycleTabs(direction) {
  if (tabs.length < 2) return;
  const idx = tabs.findIndex(t => t.id === activeTabId);
  const next = (idx + direction + tabs.length) % tabs.length;
  activateTab(tabs[next].id);
}

function getActiveTab() {
  return tabs.find(t => t.id === activeTabId) || null;
}

function renderTabs() {
  tabsScroll.innerHTML = '';
  for (const tab of tabs) {
    const el = document.createElement('div');
    el.className = `tab${tab.id === activeTabId ? ' active' : ''}${tab.dirty ? ' dirty' : ''}`;
    el.dataset.tabId = tab.id;

    const label = document.createElement('span');
    label.className = 'tab-label';
    label.textContent = tab.dirty ? `${tab.name} *` : tab.name;
    label.addEventListener('click', () => activateTab(tab.id));
    el.appendChild(label);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'tab-close';
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', `Close ${tab.name}`);
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(tab.id);
    });
    el.appendChild(closeBtn);

    tabsScroll.appendChild(el);
  }

  // Notify main process about dirty state
  const anyDirty = tabs.some(t => t.dirty);
  if (api?.setDirtyState) api.setDirtyState(anyDirty);
}

// ── File tree rendering ───────────────────────────────────────────────────────
function renderFileTree(entries, container, depth) {
  container.innerHTML = '';
  const filterText = sidebarFilterInput ? sidebarFilterInput.value.toLowerCase() : '';

  for (const entry of entries) {
    if (entry.type === 'folder') {
      const hasMatchingChild = filterText ? entryMatchesFilter(entry, filterText) : true;
      if (!hasMatchingChild) continue;

      const folder = document.createElement('details');
      folder.className = 'tree-folder';
      if (depth === 0 || filterText) folder.open = true;

      const summary = document.createElement('summary');
      summary.className = 'tree-item tree-item-folder';
      summary.style.paddingLeft = `${12 + depth * 14}px`;
      summary.textContent = entry.name;

      // Context actions for folders
      summary.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e, entry);
      });

      folder.appendChild(summary);

      const childContainer = document.createElement('div');
      renderFileTree(entry.children, childContainer, depth + 1);
      folder.appendChild(childContainer);
      container.appendChild(folder);
    } else {
      if (filterText && !entry.name.toLowerCase().includes(filterText)) continue;

      const file = document.createElement('div');
      file.className = 'tree-item tree-item-file';
      file.style.paddingLeft = `${12 + depth * 14}px`;
      file.textContent = entry.name;
      file.dataset.path = entry.path;
      const gitClass = gitStatusClassForPath(entry.path);
      if (gitClass) file.classList.add(gitClass);
      file.addEventListener('click', () => openFile(entry));
      file.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e, entry);
      });

      // Check if this file is in an active tab
      if (tabs.some(t => t.path === entry.path && t.id === activeTabId)) {
        file.classList.add('active');
      }
      container.appendChild(file);
    }
  }
}

function entryMatchesFilter(entry, filter) {
  if (entry.type === 'file') return entry.name.toLowerCase().includes(filter);
  if (entry.children) return entry.children.some(child => entryMatchesFilter(child, filter));
  return false;
}

// Sidebar filter
if (sidebarFilterInput) {
  sidebarFilterInput.addEventListener('input', () => {
    if (workspaceTree) renderFileTree(workspaceTree.children, fileTreeEl, 0);
  });
}

// ── Context menu ──────────────────────────────────────────────────────────────
function showContextMenu(event, entry) {
  // Remove existing context menu
  document.querySelectorAll('.context-menu').forEach(el => el.remove());

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.left = `${event.clientX}px`;
  menu.style.top = `${event.clientY}px`;

  const items = [];
  if (entry.type === 'folder') {
    items.push({ label: 'New File…', action: () => promptNewFile(entry.path) });
    items.push({ label: 'New Folder…', action: () => promptNewFolder(entry.path) });
  }
  items.push({ label: 'Rename…', action: () => promptRename(entry) });
  items.push({ label: 'Delete', action: () => deleteEntry(entry) });

  for (const item of items) {
    const el = document.createElement('div');
    el.className = 'context-menu-item';
    el.textContent = item.label;
    el.addEventListener('click', () => {
      menu.remove();
      item.action();
    });
    menu.appendChild(el);
  }

  document.body.appendChild(menu);
  const dismiss = () => { menu.remove(); document.removeEventListener('click', dismiss); };
  setTimeout(() => document.addEventListener('click', dismiss), 0);
}

// ── File CRUD ─────────────────────────────────────────────────────────────────
async function promptNewFile(parentDir) {
  const dir = parentDir || workspaceRoot;
  if (!dir) return;
  const name = await showInputDialog('New File', 'Enter file name:', 'untitled.md');
  if (!name) return;
  try {
    const entry = await api.createNewFile(dir, name);
    const tree = await api.refreshTree();
    if (tree) {
      workspaceTree = tree;
      renderFileTree(tree.children, fileTreeEl, 0);
      refreshGitStatus();
    }
    openFile(entry);
  } catch (err) {
    window.alert(err.message);
  }
}

async function promptNewFolder(parentDir) {
  const dir = parentDir || workspaceRoot;
  if (!dir) return;
  const name = await showInputDialog('New Folder', 'Enter folder name:', 'new-folder');
  if (!name) return;
  try {
    await api.createNewFolder(dir, name);
    const tree = await api.refreshTree();
    if (tree) {
      workspaceTree = tree;
      renderFileTree(tree.children, fileTreeEl, 0);
      refreshGitStatus();
    }
  } catch (err) {
    window.alert(err.message);
  }
}

async function promptRename(entry) {
  const newName = await showInputDialog('Rename', `Rename "${entry.name}" to:`, entry.name);
  if (!newName || newName === entry.name) return;
  try {
    const result = await api.renameFile(entry.path, newName);
    // Update any open tabs pointing to this file
    for (const tab of tabs) {
      if (tab.path === entry.path) {
        tab.path = result.newPath;
        tab.name = result.newName;
      }
    }
    renderTabs();
    const tree = await api.refreshTree();
    if (tree) {
      workspaceTree = tree;
      renderFileTree(tree.children, fileTreeEl, 0);
      refreshGitStatus();
    }
  } catch (err) {
    window.alert(err.message);
  }
}

async function deleteEntry(entry) {
  try {
    const deleted = await api.deleteFile(entry.path);
    if (!deleted) return;
    // Close any tabs for this file
    const tab = tabs.find(t => t.path === entry.path);
    if (tab) {
      tabs.splice(tabs.indexOf(tab), 1);
      if (activeTabId === tab.id) {
        if (tabs.length > 0) activateTab(tabs[0].id);
        else { activeTabId = null; resetEditorState(); }
      }
      renderTabs();
    }
    const tree = await api.refreshTree();
    if (tree) {
      workspaceTree = tree;
      renderFileTree(tree.children, fileTreeEl, 0);
      refreshGitStatus();
    }
  } catch (err) {
    window.alert(err.message);
  }
}

// ── Input dialog ──────────────────────────────────────────────────────────────
function showInputDialog(title, label, defaultValue) {
  return new Promise((resolve) => {
    inputDialogLabel.textContent = label;
    inputDialogInput.value = defaultValue || '';
    inputDialog.hidden = false;
    inputDialogInput.focus();
    inputDialogInput.select();

    function cleanup() {
      inputDialog.hidden = true;
      inputDialogOk.removeEventListener('click', onOk);
      inputDialogCancel.removeEventListener('click', onCancel);
      inputDialogInput.removeEventListener('keydown', onKey);
    }

    function onOk() { cleanup(); resolve(inputDialogInput.value.trim() || null); }
    function onCancel() { cleanup(); resolve(null); }
    function onKey(e) {
      if (e.key === 'Enter') onOk();
      if (e.key === 'Escape') onCancel();
    }

    inputDialogOk.addEventListener('click', onOk);
    inputDialogCancel.addEventListener('click', onCancel);
    inputDialogInput.addEventListener('keydown', onKey);
  });
}

function closeInputDialog() {
  inputDialog.hidden = true;
}

// ── Open file → tab ───────────────────────────────────────────────────────────
async function openFile(entry) {
  try {
    const tab = createTab(entry.path, entry.name);
    if (tab.content && tabs.find(t => t.id === tab.id)?.id === activeTabId) return; // already loaded & active

    const content = await api.readFile(entry.path);
    tab.content = content;
    tab.dirty = false;
    tab.scrollTop = 0;
    tab.scrollLeft = 0;
    activateTab(tab.id);
  } catch (err) {
    window.alert(`Failed to open file: ${err.message}`);
  }
}

// ── Save ──────────────────────────────────────────────────────────────────────
async function saveActiveTab() {
  const tab = getActiveTab();
  if (!tab) return true;
  return saveTab(tab.id);
}

async function saveTab(tabId) {
  const tab = tabs.find(t => t.id === tabId);
  if (!tab || !tab.path) return true;
  try {
    // Ensure content is current if this is the active tab
    if (tab.id === activeTabId) {
      tab.content = codeEditor.value;
    }
    await api.writeFile(tab.path, tab.content);
    setDirtyState(tab.id, false);
    refreshGitStatus();
    return true;
  } catch (err) {
    console.error('Save failed:', err);
    window.alert(`Save failed: ${err.message}`);
    return false;
  }
}

function setDirtyState(tabId, isDirty) {
  const tab = tabs.find(t => t.id === tabId);
  if (tab) tab.dirty = isDirty;
  renderTabs();
  updateStatusBar();
}

// ── Breadcrumbs ───────────────────────────────────────────────────────────────
function updateBreadcrumbs() {
  const tab = getActiveTab();
  if (!tab || !tab.path || !workspaceRoot) {
    breadcrumbsEl.hidden = true;
    return;
  }

  breadcrumbsEl.hidden = false;
  const relative = tab.path.replace(workspaceRoot, '').replace(/^[/\\]/, '');
  const parts = relative.split(/[/\\]/);
  breadcrumbsEl.innerHTML = parts
    .map((p, i) => `<span class="breadcrumb-item${i === parts.length - 1 ? ' current' : ''}">${escapeHtml(p)}</span>`)
    .join('<span class="breadcrumb-sep">›</span>');
}

// ── Status bar ────────────────────────────────────────────────────────────────
function updateStatusBar() {
  const tab = getActiveTab();
  const text = tab ? tab.content : '';

  // Word count
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  statusWords.textContent = `${words} word${words !== 1 ? 's' : ''}`;

  // Reading time
  const minutes = Math.max(1, Math.ceil(words / 200));
  statusReading.textContent = words > 0 ? `~${minutes} min read` : '';

  // File name
  statusFile.textContent = tab ? tab.name : '';

  updateCursorStatus();
}

function updateCursorStatus() {
  const val = codeEditor.value;
  const pos = codeEditor.selectionStart;
  const lines = val.substring(0, pos).split('\n');
  const line = lines.length;
  const col = lines[lines.length - 1].length + 1;
  statusCursor.textContent = `Ln ${line}, Col ${col}`;
}

// ── Document outline ──────────────────────────────────────────────────────────
function toggleOutline(force) {
  outlineVisible = force !== undefined ? force : !outlineVisible;
  outlinePanel.hidden = !outlineVisible;
  if (outlineVisible) updateOutline();
}

function updateOutline() {
  if (!outlineVisible) return;
  const tab = getActiveTab();
  const text = tab ? tab.content : '';
  const headings = [];

  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      headings.push({ level: match[1].length, text: match[2], line: i });
    }
  }

  outlineTree.innerHTML = '';
  for (const h of headings) {
    const el = document.createElement('div');
    el.className = 'outline-item';
    el.style.paddingLeft = `${8 + (h.level - 1) * 14}px`;
    el.textContent = h.text;
    el.addEventListener('click', () => {
      scrollEditorToLine(h.line);
    });
    outlineTree.appendChild(el);
  }

  if (headings.length === 0) {
    outlineTree.innerHTML = '<div class="outline-empty">No headings found</div>';
  }
}

function scrollEditorToLine(lineIndex) {
  const lines = codeEditor.value.split('\n');
  let charPos = 0;
  for (let i = 0; i < lineIndex && i < lines.length; i++) {
    charPos += lines[i].length + 1;
  }
  codeEditor.selectionStart = codeEditor.selectionEnd = charPos;
  codeEditor.focus();

  // Compute actual line height from the editor element
  const style = window.getComputedStyle(codeEditor);
  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.65;
  codeEditor.scrollTop = Math.max(0, lineIndex * lineHeight - codeEditor.clientHeight / 3);
}

// ── Command palette ───────────────────────────────────────────────────────────
function toggleCommandPalette(show) {
  commandPalette.hidden = !show;
  if (show) {
    paletteInput.value = '';
    paletteResults.innerHTML = '';
    paletteInput.focus();
    loadPaletteFiles();
  }
}

let paletteFiles = [];

async function loadPaletteFiles() {
  paletteFiles = await api.getAllFiles();
  renderPaletteResults('');
}

paletteInput.addEventListener('input', () => {
  renderPaletteResults(paletteInput.value);
});

paletteInput.addEventListener('keydown', (e) => {
  const items = paletteResults.querySelectorAll('.palette-item');
  const active = paletteResults.querySelector('.palette-item.active');
  let idx = Array.from(items).indexOf(active);

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (active) active.classList.remove('active');
    idx = Math.min(idx + 1, items.length - 1);
    if (items[idx]) { items[idx].classList.add('active'); items[idx].scrollIntoView({ block: 'nearest' }); }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (active) active.classList.remove('active');
    idx = Math.max(idx - 1, 0);
    if (items[idx]) { items[idx].classList.add('active'); items[idx].scrollIntoView({ block: 'nearest' }); }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (active) active.click();
    else if (items[0]) items[0].click();
  }
});

function renderPaletteResults(query) {
  const lq = query.toLowerCase();
  const matches = paletteFiles
    .filter(f => fuzzyMatch(f.relativePath, lq))
    .slice(0, 20);

  paletteResults.innerHTML = '';
  for (const file of matches) {
    const el = document.createElement('div');
    el.className = 'palette-item';
    el.innerHTML = `<span class="palette-name">${escapeHtml(file.name)}</span><span class="palette-path">${escapeHtml(file.relativePath)}</span>`;
    el.addEventListener('click', () => {
      toggleCommandPalette(false);
      openFile(file);
    });
    paletteResults.appendChild(el);
  }

  if (matches.length === 0) {
    paletteResults.innerHTML = '<div class="palette-empty">No files found</div>';
  } else {
    paletteResults.firstChild.classList.add('active');
  }
}

function fuzzyMatch(text, query) {
  if (!query) return true;
  const lower = text.toLowerCase();
  let qi = 0;
  for (let i = 0; i < lower.length && qi < query.length; i++) {
    if (lower[i] === query[qi]) qi++;
  }
  return qi === query.length;
}

// ── Workspace search ──────────────────────────────────────────────────────────
function toggleSearchPanel(show) {
  searchPanel.hidden = !show;
  if (show) {
    searchInput.value = '';
    searchResults.innerHTML = '';
    searchInput.focus();
  }
}

let searchDebounce = null;
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(async () => {
    const query = searchInput.value.trim();
    if (query.length < 2) { searchResults.innerHTML = ''; return; }
    const results = await api.searchWorkspace(query);
    renderSearchResults(results, query);
  }, 300);
});

function renderSearchResults(results, query) {
  searchResults.innerHTML = '';
  if (results.length === 0) {
    searchResults.innerHTML = '<div class="search-empty">No results found</div>';
    return;
  }

  // Group by file
  const grouped = {};
  for (const r of results) {
    if (!grouped[r.file]) grouped[r.file] = { relativePath: r.relativePath, fileName: r.fileName, matches: [] };
    grouped[r.file].matches.push(r);
  }

  for (const [filePath, group] of Object.entries(grouped)) {
    const fileEl = document.createElement('div');
    fileEl.className = 'search-file-group';

    const header = document.createElement('div');
    header.className = 'search-file-header';
    header.innerHTML = `<strong>${escapeHtml(group.fileName)}</strong> <span class="search-file-path">${escapeHtml(group.relativePath)}</span> <span class="search-match-count">${group.matches.length}</span>`;
    fileEl.appendChild(header);

    for (const match of group.matches.slice(0, 10)) {
      const line = document.createElement('div');
      line.className = 'search-match-line';
      line.innerHTML = `<span class="search-line-num">${match.line}</span> ${highlightSearchMatch(match.text, query)}`;
      line.addEventListener('click', () => {
        toggleSearchPanel(false);
        openFile({ path: filePath, name: group.fileName });
      });
      fileEl.appendChild(line);
    }

    if (group.matches.length > 10) {
      const more = document.createElement('div');
      more.className = 'search-more';
      more.textContent = `… ${group.matches.length - 10} more match${group.matches.length - 10 > 1 ? 'es' : ''} in this file`;
      fileEl.appendChild(more);
    }

    searchResults.appendChild(fileEl);
  }
}

function highlightSearchMatch(text, query) {
  const escaped = escapeHtml(text);
  const lq = query.toLowerCase();
  const idx = escaped.toLowerCase().indexOf(lq);
  if (idx === -1) return escaped;
  return escaped.substring(0, idx) + '<mark>' + escaped.substring(idx, idx + lq.length) + '</mark>' + escaped.substring(idx + lq.length);
}

// ── Find & replace in editor ──────────────────────────────────────────────────
function toggleFindBar(show, withReplace) {
  findBar.hidden = !show;
  if (show) {
    replaceRow.hidden = !withReplace;
    findInput.focus();
    if (codeEditor.selectionStart !== codeEditor.selectionEnd) {
      findInput.value = codeEditor.value.substring(codeEditor.selectionStart, codeEditor.selectionEnd);
    }
    runFind();
  } else {
    findMatches = [];
    findMatchIndex = -1;
    findCount.textContent = '';
  }
}

findInput.addEventListener('input', runFind);
findNext.addEventListener('click', () => navigateFind(1));
findPrev.addEventListener('click', () => navigateFind(-1));
findInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); navigateFind(e.shiftKey ? -1 : 1); }
});
replaceOne.addEventListener('click', doReplaceOne);
replaceAll.addEventListener('click', doReplaceAll);

function runFind() {
  const query = findInput.value;
  findMatches = [];
  findMatchIndex = -1;
  if (!query) { findCount.textContent = ''; return; }

  const text = codeEditor.value.toLowerCase();
  const lq = query.toLowerCase();
  let pos = 0;
  while (true) {
    const idx = text.indexOf(lq, pos);
    if (idx === -1) break;
    findMatches.push(idx);
    pos = idx + 1;
  }

  findCount.textContent = findMatches.length > 0 ? `${findMatches.length} found` : 'No results';
  if (findMatches.length > 0) navigateFind(0);
}

function navigateFind(direction) {
  if (findMatches.length === 0) return;
  findMatchIndex = (findMatchIndex + direction + findMatches.length) % findMatches.length;
  const pos = findMatches[findMatchIndex];
  codeEditor.selectionStart = pos;
  codeEditor.selectionEnd = pos + findInput.value.length;
  codeEditor.focus();

  // Scroll to match
  const lines = codeEditor.value.substring(0, pos).split('\n');
  const style = window.getComputedStyle(codeEditor);
  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.65;
  codeEditor.scrollTop = Math.max(0, (lines.length - 1) * lineHeight - codeEditor.clientHeight / 3);

  findCount.textContent = `${findMatchIndex + 1}/${findMatches.length}`;
}

function doReplaceOne() {
  if (findMatchIndex < 0 || findMatches.length === 0) return;
  const pos = findMatches[findMatchIndex];
  const val = codeEditor.value;
  codeEditor.value = val.substring(0, pos) + replaceInput.value + val.substring(pos + findInput.value.length);
  onEditorInput();
  runFind();
}

function doReplaceAll() {
  if (!findInput.value) return;
  const val = codeEditor.value;
  // Case-insensitive replace all
  const regex = new RegExp(findInput.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  codeEditor.value = val.replace(regex, replaceInput.value);
  onEditorInput();
  runFind();
}

// ── Keyboard shortcuts overlay ────────────────────────────────────────────────
function toggleShortcuts(force) {
  const show = force !== undefined ? force : shortcutsOverlay.hidden;
  shortcutsOverlay.hidden = !show;
}

// ── Zen mode ──────────────────────────────────────────────────────────────────
function toggleZenMode() {
  zenMode = !zenMode;
  editorWorkspace.classList.toggle('zen-mode', zenMode);
}

// ── Toggle sidebar ────────────────────────────────────────────────────────────
function toggleSidebar() {
  sidebar.classList.toggle('collapsed');
  sidebarResize.hidden = sidebar.classList.contains('collapsed');
}

// ── Resizable sidebar ─────────────────────────────────────────────────────────
let resizing = null;

sidebarResize.addEventListener('mousedown', (e) => {
  e.preventDefault();
  resizing = 'sidebar';
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
});

paneResize.addEventListener('mousedown', (e) => {
  e.preventDefault();
  resizing = 'pane';
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
});

document.addEventListener('mousemove', (e) => {
  if (!resizing) return;
  if (resizing === 'sidebar') {
    const width = Math.max(160, Math.min(500, e.clientX));
    sidebar.style.width = `${width}px`;
  } else if (resizing === 'pane') {
    const editorArea = document.querySelector('.editor-area');
    const rect = editorArea.getBoundingClientRect();
    const panes = document.querySelector('.panes');
    const editorPane = document.querySelector('.pane-editor');
    const offset = e.clientX - rect.left;
    const pct = Math.max(20, Math.min(80, (offset / panes.offsetWidth) * 100));
    editorPane.style.flex = `0 0 ${pct}%`;
  }
});

document.addEventListener('mouseup', () => {
  if (resizing) {
    resizing = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
});

// ── Export HTML ────────────────────────────────────────────────────────────────
async function exportCurrentHtml() {
  const tab = getActiveTab();
  if (!tab) return;
  await renderMermaidDiagrams();
  const htmlBody = previewEl.innerHTML;
  const fullHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${escapeHtml(tab.name)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.7; color: #1d2625; }
    h1, h2, h3 { margin-top: 1.4em; }
    code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
    pre { background: #1a1d23; color: #c8cdd3; padding: 16px; border-radius: 8px; overflow-x: auto; }
    pre code { background: none; padding: 0; color: inherit; }
    blockquote { border-left: 3px solid #126a58; padding-left: 14px; color: #666; margin: 12px 0; }
    table { border-collapse: collapse; width: 100%; margin: 14px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
    th { background: #f5f5f5; font-weight: 700; }
    img { max-width: 100%; border-radius: 8px; }
    a { color: #126a58; }
    hr { border: none; border-top: 1px solid #ddd; margin: 20px 0; }
    .task-item { list-style: none; }
    .task-item input { margin-right: 8px; }
  </style>
</head>
<body>${htmlBody}</body>
</html>`;

  const suggestedName = tab.name.replace(/\.md$/i, '.html');
  await api.exportHtml(fullHtml, suggestedName);
}

async function exportCurrentPdf() {
  const tab = getActiveTab();
  if (!tab) return;
  await renderMermaidDiagrams();
  const htmlBody = previewEl.innerHTML;
  const suggestedName = tab.name.replace(/\.md$/i, '.pdf');
  await api.exportPdf(htmlBody, suggestedName);
}

async function refreshGitStatus() {
  if (!workspaceRoot || !api?.getGitStatus) {
    gitStatusMap = new Map();
    return;
  }

  try {
    const result = await api.getGitStatus();
    const next = new Map();
    if (result?.available) {
      for (const entry of result.entries || []) {
        next.set(normalizeFsPath(entry.path), entry.status.trim() || '?');
      }
    }
    gitStatusMap = next;
    if (workspaceTree) renderFileTree(workspaceTree.children, fileTreeEl, 0);
  } catch (_) {
    gitStatusMap = new Map();
  }
}

function gitStatusClassForPath(filePath) {
  const status = gitStatusMap.get(normalizeFsPath(filePath));
  if (!status) return '';
  if (status.includes('?')) return 'git-untracked';
  if (status.includes('A')) return 'git-added';
  if (status.includes('D')) return 'git-deleted';
  if (/[MRCU]/.test(status)) return 'git-modified';
  return '';
}

function toggleDiffOverlay(show) {
  diffOverlay.hidden = !show;
}

async function openGitDiff() {
  const tab = getActiveTab();
  if (!tab?.path) return;

  const result = await api.getGitDiff(tab.path);
  diffTitle.textContent = `Git diff • ${tab.name}`;

  const unsavedNote = tab.dirty
    ? 'Unsaved editor changes are not included in this diff yet. Save the file to compare against Git.\n\n'
    : '';

  if (!result?.available) {
    diffOutput.textContent = `${unsavedNote}Git diff is unavailable for this workspace.`;
  } else if (!result.diff || !result.diff.trim()) {
    diffOutput.textContent = `${unsavedNote}No tracked Git changes for this file.`;
  } else {
    diffOutput.textContent = `${unsavedNote}${result.diff}`;
  }

  toggleDiffOverlay(true);
}

function toggleBrokenLinkOverlay(show) {
  linkCheckOverlay.hidden = !show;
}

function runBrokenLinkCheck(showOverlay = false) {
  const tab = getActiveTab();
  brokenLinkResults = tab?.path ? findBrokenLinks(tab.content, tab.path) : [];
  renderBrokenLinkStatus();
  renderBrokenLinkResults();
  annotatePreviewBrokenLinks();
  if (showOverlay) toggleBrokenLinkOverlay(true);
  return brokenLinkResults;
}

function renderBrokenLinkStatus() {
  if (!statusEncoding) return;
  if (brokenLinkResults.length === 0) {
    statusEncoding.textContent = 'Links: OK';
    statusEncoding.classList.remove('status-warning');
    return;
  }
  statusEncoding.textContent = `Links: ${brokenLinkResults.length} broken`;
  statusEncoding.classList.add('status-warning');
}

function renderBrokenLinkResults() {
  linkCheckResults.innerHTML = '';
  if (brokenLinkResults.length === 0) {
    linkCheckResults.innerHTML = '<div class="search-empty">No broken relative links found in the active file.</div>';
    return;
  }

  for (const issue of brokenLinkResults) {
    const item = document.createElement('div');
    item.className = 'link-issue';
    item.innerHTML = `<strong>${escapeHtml(issue.target)}</strong><div class="link-issue-meta">Line ${issue.line} • ${escapeHtml(issue.reason)}</div>`;
    item.addEventListener('click', () => {
      toggleBrokenLinkOverlay(false);
      scrollEditorToLine(issue.line - 1);
    });
    linkCheckResults.appendChild(item);
  }
}

function annotatePreviewBrokenLinks() {
  const broken = new Set(brokenLinkResults.map(issue => issue.target));
  previewEl.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute('href') || '';
    if (broken.has(href)) link.classList.add('broken-link');
    else link.classList.remove('broken-link');
  });
}

function findBrokenLinks(source, currentFilePath) {
  const entries = collectWorkspaceEntries(workspaceTree?.children || []);
  const knownPaths = new Set(entries.map(entry => normalizeFsPath(entry.path)));
  const issues = [];
  const lines = source.split('\n');

  lines.forEach((lineText, index) => {
    const regex = /!?\[[^\]]*\]\(([^)]+)\)/g;
    let match;
    while ((match = regex.exec(lineText)) !== null) {
      const rawTarget = match[1].trim().split(/\s+/)[0];
      if (!isRelativeMarkdownTarget(rawTarget)) continue;
      const resolved = resolveMarkdownTarget(currentFilePath, rawTarget);
      if (!resolved || !knownPaths.has(normalizeFsPath(resolved))) {
        issues.push({ target: rawTarget, line: index + 1, reason: 'Target does not exist in the workspace' });
      }
    }
  });

  return issues;
}

function isRelativeMarkdownTarget(target) {
  return target && !/^([a-z]+:|#|mailto:|tel:)/i.test(target);
}

function resolveMarkdownTarget(currentFilePath, target) {
  const cleanTarget = target.split('#')[0].split('?')[0];
  if (!cleanTarget) return null;
  if (cleanTarget.startsWith('/')) return joinWorkspacePath(workspaceRoot, cleanTarget.slice(1));
  return joinWorkspacePath(dirnamePath(currentFilePath), cleanTarget);
}

function updateLinkSuggestions() {
  const context = getLinkAutocompleteContext();
  if (!context) {
    hideLinkSuggestions();
    return;
  }

  const files = collectWorkspaceEntries(workspaceTree?.children || []).filter(entry => entry.type === 'file');
  const suggestions = files
    .filter(entry => !context.isImage || /\.(png|jpe?g|gif|webp|svg)$/i.test(entry.name))
    .map(entry => ({
      entry,
      relativePath: relativePathBetween(getActiveTab()?.path, entry.path)
    }))
    .filter(item => item.relativePath.toLowerCase().includes(context.query.toLowerCase()))
    .slice(0, 12);

  if (suggestions.length === 0) {
    hideLinkSuggestions();
    return;
  }

  suggestionItems = suggestions;
  suggestionIndex = 0;
  suggestionRange = context.range;
  renderLinkSuggestions();
}

function getLinkAutocompleteContext() {
  const beforeCursor = codeEditor.value.slice(0, codeEditor.selectionStart);
  const match = beforeCursor.match(/(!?\[[^\]]*\]\()([^\n)]*)$/);
  if (!match) return null;
  return {
    isImage: match[1].startsWith('!'),
    query: match[2],
    range: {
      start: codeEditor.selectionStart - match[2].length,
      end: codeEditor.selectionStart
    }
  };
}

function renderLinkSuggestions() {
  if (suggestionItems.length === 0) {
    hideLinkSuggestions();
    return;
  }

  linkSuggestions.hidden = false;
  linkSuggestions.innerHTML = '';

  suggestionItems.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = `link-suggestion-item${index === suggestionIndex ? ' active' : ''}`;
    row.innerHTML = `<span class="link-suggestion-path">${escapeHtml(item.relativePath)}</span><span class="link-suggestion-meta">${escapeHtml(item.entry.name)}</span>`;
    row.addEventListener('mousedown', (event) => {
      event.preventDefault();
      suggestionIndex = index;
      applyLinkSuggestion();
    });
    linkSuggestions.appendChild(row);
  });
}

function moveLinkSuggestion(direction) {
  if (suggestionItems.length === 0) return;
  suggestionIndex = (suggestionIndex + direction + suggestionItems.length) % suggestionItems.length;
  renderLinkSuggestions();
}

function applyLinkSuggestion() {
  if (!suggestionRange || suggestionItems.length === 0) return;
  const selected = suggestionItems[suggestionIndex];
  const before = codeEditor.value.slice(0, suggestionRange.start);
  const after = codeEditor.value.slice(suggestionRange.end);
  codeEditor.value = `${before}${selected.relativePath}${after}`;
  const nextCursor = suggestionRange.start + selected.relativePath.length;
  codeEditor.selectionStart = codeEditor.selectionEnd = nextCursor;
  hideLinkSuggestions();
  onEditorInput();
  codeEditor.focus();
}

function hideLinkSuggestions() {
  suggestionItems = [];
  suggestionRange = null;
  linkSuggestions.hidden = true;
  linkSuggestions.innerHTML = '';
}

async function handleExternalDrop(event) {
  const tab = getActiveTab();
  if (!workspaceRoot || !tab?.path) return;

  const files = Array.from(event.dataTransfer?.files || []).map(file => file.path).filter(Boolean);
  if (files.length === 0) return;

  const imported = await api.importFilesIntoWorkspace(files, dirnamePath(tab.path));
  if (!imported || imported.length === 0) return;

  const insertText = imported
    .map(file => {
      const relative = relativePathBetween(tab.path, file.path);
      return file.isImage ? `![](${relative})` : `[${file.name}](${relative})`;
    })
    .join('\n');

  insertTextAtCursor(`${insertText}\n`);
  const tree = await api.refreshTree();
  if (tree) {
    workspaceTree = tree;
    renderFileTree(tree.children, fileTreeEl, 0);
    refreshGitStatus();
  }
}

function insertTextAtCursor(text) {
  const start = codeEditor.selectionStart;
  const end = codeEditor.selectionEnd;
  const value = codeEditor.value;
  codeEditor.value = value.slice(0, start) + text + value.slice(end);
  codeEditor.selectionStart = codeEditor.selectionEnd = start + text.length;
  onEditorInput();
}

function syncPreviewToEditor() {
  if (previewSyncLock === 'preview') return;
  previewSyncLock = 'editor';
  syncScrollPosition(codeEditor, previewPane);
  queueMicrotask(() => { previewSyncLock = null; });
}

function syncEditorToPreview() {
  if (previewSyncLock === 'editor') return;
  previewSyncLock = 'preview';
  syncScrollPosition(previewPane, codeEditor);
  queueMicrotask(() => { previewSyncLock = null; });
}

function syncScrollPosition(fromEl, toEl) {
  const fromMax = Math.max(1, fromEl.scrollHeight - fromEl.clientHeight);
  const toMax = Math.max(1, toEl.scrollHeight - toEl.clientHeight);
  const ratio = fromEl.scrollTop / fromMax;
  toEl.scrollTop = ratio * toMax;
}

async function loadMermaid() {
  if (globalThis.mermaid) return globalThis.mermaid;
  if (!mermaidLoaderPromise) {
    mermaidLoaderPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL('../../node_modules/mermaid/dist/mermaid.min.js', window.location.href).toString();
      script.onload = () => resolve(globalThis.mermaid);
      script.onerror = () => reject(new Error('Failed to load Mermaid renderer'));
      document.head.appendChild(script);
    });
  }
  const mermaid = await mermaidLoaderPromise;
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
  return mermaid;
}

async function renderMermaidDiagrams() {
  const blocks = Array.from(previewEl.querySelectorAll('.mermaid-block[data-mermaid]'));
  if (blocks.length === 0) return;

  try {
    const mermaid = await loadMermaid();
    for (const [index, block] of blocks.entries()) {
      const source = block.dataset.mermaid || '';
      const { svg } = await mermaid.render(`docfoundry-mermaid-${Date.now()}-${index}`, source);
      block.innerHTML = svg;
    }
  } catch (_) {
    for (const block of blocks) {
      block.innerHTML = `<pre class="mermaid-fallback">${escapeHtml(block.dataset.mermaid || '')}</pre>`;
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function highlightActiveFileInTree() {
  document.querySelectorAll('.tree-item-file.active').forEach(el => el.classList.remove('active'));
  const tab = getActiveTab();
  if (!tab) return;
  const match = document.querySelector(`.tree-item-file[data-path="${CSS.escape(tab.path)}"]`);
  if (match) match.classList.add('active');
}

function resetEditorState() {
  codeEditor.value = '';
  renderPreview('');
  updateStatusBar();
  updateBreadcrumbs();
  updateOutline();
  hideLinkSuggestions();
  brokenLinkResults = [];
  renderBrokenLinkStatus();
  document.querySelectorAll('.tree-item-file.active').forEach(el => el.classList.remove('active'));
}

function renderPreview(source) {
  previewEl.innerHTML = markdownToHtml(source);
  renderMermaidDiagrams();
  runBrokenLinkCheck(false);
}

function collectWorkspaceEntries(entries, items = []) {
  for (const entry of entries) {
    items.push(entry);
    if (entry.type === 'folder' && Array.isArray(entry.children)) {
      collectWorkspaceEntries(entry.children, items);
    }
  }
  return items;
}

function normalizeFsPath(input) {
  return String(input || '').replace(/\\/g, '/').replace(/\/+/g, '/');
}

function dirnamePath(filePath) {
  const normalized = normalizeFsPath(filePath);
  const parts = normalized.split('/');
  parts.pop();
  return parts.join('/') || normalized;
}

function joinWorkspacePath(basePath, relativePath) {
  const baseParts = normalizeFsPath(basePath).split('/');
  const relativeParts = normalizeFsPath(relativePath).split('/');
  const joined = [...baseParts];

  for (const part of relativeParts) {
    if (!part || part === '.') continue;
    if (part === '..') joined.pop();
    else joined.push(part);
  }

  return joined.join('/');
}

function relativePathBetween(fromFilePath, toPath) {
  const root = normalizeFsPath(workspaceRoot || '');
  const fromDir = normalizeFsPath(dirnamePath(fromFilePath)).replace(root, '').replace(/^\//, '');
  const toRelative = normalizeFsPath(toPath).replace(root, '').replace(/^\//, '');
  const fromSegments = fromDir ? fromDir.split('/') : [];
  const toSegments = toRelative ? toRelative.split('/') : [];

  while (fromSegments.length && toSegments.length && fromSegments[0] === toSegments[0]) {
    fromSegments.shift();
    toSegments.shift();
  }

  const prefix = fromSegments.map(() => '..');
  return [...prefix, ...toSegments].join('/') || '.';
}
