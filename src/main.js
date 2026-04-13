const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { resolveWorkspacePath, validateFileName } = require('./lib/workspace-path');

// Hot reload in development
if (!app.isPackaged) {
  try {
    require('electron-reload')(path.join(__dirname, '..'), {
      electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
      forceHardReset: true
    });
  } catch (_) {
    // electron-reload not installed — skip
  }
}

let mainWindow = null;
let currentFolder = null;
let hasUnsavedChanges = false;
let allowWindowClose = false;
let fileWatcher = null;

function createWindow() {
  allowWindowClose = false;
  hasUnsavedChanges = false;

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 980,
    minHeight: 640,
    title: 'DocFoundry',
    backgroundColor: '#1a1d23',
    icon: path.join(__dirname, '..', 'build', 'icon.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.on('close', handleWindowClose);

  buildAppMenu();

  // Auto-update check (non-blocking, only in packaged builds)
  if (app.isPackaged) {
    try {
      const { autoUpdater } = require('electron-updater');
      autoUpdater.checkForUpdatesAndNotify();
    } catch (_) {
      // electron-updater not available in dev
    }
  }
}

// ── App menu with keyboard shortcuts ──────────────────────────────────────────

function buildAppMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: 'File',
      submenu: [
        { label: 'Open Folder…', accelerator: 'CmdOrCtrl+O', click: () => mainWindow.webContents.send('menu-open-folder') },
        { label: 'New File…', accelerator: 'CmdOrCtrl+N', click: () => mainWindow.webContents.send('menu-new-file') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => mainWindow.webContents.send('menu-save') },
        { label: 'Export HTML…', accelerator: 'CmdOrCtrl+Shift+E', click: () => mainWindow.webContents.send('menu-export-html') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' },
        { label: 'Find in File…', accelerator: 'CmdOrCtrl+F', click: () => mainWindow.webContents.send('menu-find') },
        { label: 'Replace in File…', accelerator: 'CmdOrCtrl+H', click: () => mainWindow.webContents.send('menu-replace') }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Command Palette…', accelerator: 'CmdOrCtrl+P', click: () => mainWindow.webContents.send('menu-command-palette') },
        { label: 'Workspace Search…', accelerator: 'CmdOrCtrl+Shift+F', click: () => mainWindow.webContents.send('menu-workspace-search') },
        { type: 'separator' },
        { label: 'Toggle Sidebar', accelerator: 'CmdOrCtrl+B', click: () => mainWindow.webContents.send('menu-toggle-sidebar') },
        { label: 'Toggle Outline', accelerator: 'CmdOrCtrl+Shift+O', click: () => mainWindow.webContents.send('menu-toggle-outline') },
        { label: 'Zen Mode', accelerator: 'CmdOrCtrl+Shift+Z', click: () => mainWindow.webContents.send('menu-zen-mode') },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Keyboard Shortcuts', accelerator: 'CmdOrCtrl+/', click: () => mainWindow.webContents.send('menu-shortcuts') }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── Close guard ───────────────────────────────────────────────────────────────

function handleWindowClose(event) {
  if (allowWindowClose || !hasUnsavedChanges || !mainWindow) {
    stopFileWatcher();
    return;
  }

  event.preventDefault();
  const choice = dialog.showMessageBoxSync(mainWindow, {
    type: 'warning',
    buttons: ['Save', 'Discard', 'Cancel'],
    defaultId: 0,
    cancelId: 2,
    noLink: true,
    title: 'Unsaved changes',
    message: 'You have unsaved changes.',
    detail: 'Save the current file before closing DocFoundry?'
  });

  if (choice === 0) {
    mainWindow.webContents.send('request-save-and-close');
    return;
  }

  if (choice === 1) {
    allowWindowClose = true;
    mainWindow.close();
  }
}

// ── IPC: folder operations ────────────────────────────────────────────────────

ipcMain.handle('open-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  currentFolder = path.resolve(result.filePaths[0]);
  hasUnsavedChanges = false;
  startFileWatcher(currentFolder);
  return readFolderTree(currentFolder);
});

ipcMain.handle('read-file', async (_event, filePath) => {
  const resolved = resolveWorkspacePath(currentFolder, filePath);
  return fs.readFileSync(resolved, 'utf-8');
});

ipcMain.handle('write-file', async (_event, filePath, content) => {
  const resolved = resolveWorkspacePath(currentFolder, filePath);
  fs.writeFileSync(resolved, content, 'utf-8');
  hasUnsavedChanges = false;
  return true;
});

ipcMain.on('set-dirty-state', (_event, isDirty) => {
  hasUnsavedChanges = Boolean(isDirty);
});

ipcMain.handle('confirm-save-and-close', async (_event, didSave) => {
  if (!didSave) return false;

  hasUnsavedChanges = false;
  allowWindowClose = true;

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }

  return true;
});

ipcMain.handle('create-workspace', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  currentFolder = path.resolve(result.filePaths[0]);
  hasUnsavedChanges = false;
  const entries = fs.readdirSync(currentFolder);
  if (entries.length === 0) {
    const readme = path.join(currentFolder, 'README.md');
    fs.writeFileSync(readme, '# New Workspace\n\nStart writing here.\n', 'utf-8');
  }
  startFileWatcher(currentFolder);
  return readFolderTree(currentFolder);
});

// ── IPC: file operations ──────────────────────────────────────────────────────

ipcMain.handle('create-new-file', async (_event, parentDir, fileName) => {
  validateFileName(fileName);
  const resolvedDir = resolveWorkspacePath(currentFolder, parentDir);
  const filePath = path.join(resolvedDir, fileName);
  if (fs.existsSync(filePath)) {
    throw new Error('File already exists');
  }
  fs.writeFileSync(filePath, '', 'utf-8');
  return { path: filePath, name: fileName, type: 'file' };
});

ipcMain.handle('create-new-folder', async (_event, parentDir, folderName) => {
  validateFileName(folderName);
  const resolvedDir = resolveWorkspacePath(currentFolder, parentDir);
  const folderPath = path.join(resolvedDir, folderName);
  if (fs.existsSync(folderPath)) {
    throw new Error('Folder already exists');
  }
  fs.mkdirSync(folderPath, { recursive: true });
  return { path: folderPath, name: folderName, type: 'folder', children: [] };
});

ipcMain.handle('delete-file', async (_event, filePath) => {
  const resolved = resolveWorkspacePath(currentFolder, filePath);
  const choice = dialog.showMessageBoxSync(mainWindow, {
    type: 'warning',
    buttons: ['Delete', 'Cancel'],
    defaultId: 1,
    cancelId: 1,
    noLink: true,
    title: 'Delete file',
    message: `Delete "${path.basename(resolved)}"?`,
    detail: 'This action cannot be undone.'
  });
  if (choice !== 0) return false;

  const stat = fs.statSync(resolved);
  if (stat.isDirectory()) {
    fs.rmSync(resolved, { recursive: true });
  } else {
    fs.unlinkSync(resolved);
  }
  return true;
});

ipcMain.handle('rename-file', async (_event, oldPath, newName) => {
  validateFileName(newName);
  const resolvedOld = resolveWorkspacePath(currentFolder, oldPath);
  const newPath = path.join(path.dirname(resolvedOld), newName);
  if (fs.existsSync(newPath)) {
    throw new Error('A file with that name already exists');
  }
  fs.renameSync(resolvedOld, newPath);
  return { oldPath: resolvedOld, newPath, newName };
});

// ── IPC: workspace search ─────────────────────────────────────────────────────

ipcMain.handle('search-workspace', async (_event, query) => {
  if (!currentFolder || !query) return [];
  const results = [];
  const MAX_RESULTS = 200;

  function searchDir(dirPath, depth) {
    if (depth > 8 || results.length >= MAX_RESULTS) return;
    let entries;
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch (_) {
      return;
    }

    const IGNORE = new Set(['node_modules', '.git', '.DS_Store', 'Thumbs.db']);

    for (const entry of entries) {
      if (results.length >= MAX_RESULTS) break;
      if (IGNORE.has(entry.name) || entry.name.startsWith('.')) continue;
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        searchDir(fullPath, depth + 1);
      } else {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');
          const lowerQuery = query.toLowerCase();

          for (let i = 0; i < lines.length; i++) {
            if (results.length >= MAX_RESULTS) break;
            if (lines[i].toLowerCase().includes(lowerQuery)) {
              results.push({
                file: fullPath,
                fileName: entry.name,
                relativePath: path.relative(currentFolder, fullPath),
                line: i + 1,
                text: lines[i].trim().substring(0, 200)
              });
            }
          }
        } catch (_) {
          // skip binary or unreadable files
        }
      }
    }
  }

  searchDir(currentFolder, 0);
  return results;
});

// ── IPC: flat file list for command palette ───────────────────────────────────

ipcMain.handle('get-all-files', async () => {
  if (!currentFolder) return [];
  const files = [];

  function collectFiles(dirPath, depth) {
    if (depth > 8) return;
    let entries;
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch (_) {
      return;
    }

    const IGNORE = new Set(['node_modules', '.git', '.DS_Store', 'Thumbs.db']);

    for (const entry of entries) {
      if (IGNORE.has(entry.name) || entry.name.startsWith('.')) continue;
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        collectFiles(fullPath, depth + 1);
      } else {
        files.push({
          path: fullPath,
          name: entry.name,
          relativePath: path.relative(currentFolder, fullPath)
        });
      }
    }
  }

  collectFiles(currentFolder, 0);
  return files;
});

// ── IPC: export HTML ──────────────────────────────────────────────────────────

ipcMain.handle('export-html', async (_event, htmlContent, suggestedName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export HTML',
    defaultPath: suggestedName || 'document.html',
    filters: [{ name: 'HTML Files', extensions: ['html'] }]
  });
  if (result.canceled) return false;
  fs.writeFileSync(result.filePath, htmlContent, 'utf-8');
  return true;
});

// ── IPC: prompt for new file/folder name ──────────────────────────────────────

ipcMain.handle('prompt-new-file', async (_event, parentDir) => {
  // Use a simple dialog approach—send back to renderer to handle input
  return parentDir;
});

// ── IPC: refresh tree ─────────────────────────────────────────────────────────

ipcMain.handle('refresh-tree', async () => {
  if (!currentFolder) return null;
  return readFolderTree(currentFolder);
});

// ── File watcher ──────────────────────────────────────────────────────────────

function startFileWatcher(folderPath) {
  stopFileWatcher();
  try {
    fileWatcher = fs.watch(folderPath, { recursive: true }, (eventType, fileName) => {
      if (!fileName) return;
      // Sanitize: reject null bytes and control characters
      if (/[\x00-\x1f]/.test(fileName)) return;
      const IGNORE_PATTERNS = ['.git', 'node_modules', '.DS_Store'];
      if (IGNORE_PATTERNS.some(p => fileName.includes(p))) return;

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('workspace-changed', { eventType, fileName: String(fileName) });
      }
    });
  } catch (_) {
    // recursive watch not supported on all platforms
  }
}

function stopFileWatcher() {
  if (fileWatcher) {
    fileWatcher.close();
    fileWatcher = null;
  }
}

// ── File tree builder ─────────────────────────────────────────────────────────

function readFolderTree(rootPath) {
  const IGNORE = new Set(['node_modules', '.git', '.DS_Store', 'Thumbs.db']);
  const MAX_DEPTH = 8;

  function walk(dirPath, depth) {
    if (depth > MAX_DEPTH) return [];
    let entries;
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch (_) {
      return [];
    }
    return entries
      .filter(e => !IGNORE.has(e.name) && !e.name.startsWith('.'))
      .sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      })
      .map(entry => {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          return { name: entry.name, path: fullPath, type: 'folder', children: walk(fullPath, depth + 1) };
        }
        return { name: entry.name, path: fullPath, type: 'file' };
      });
  }

  return { root: rootPath, name: path.basename(rootPath), children: walk(rootPath, 0) };
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopFileWatcher();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
