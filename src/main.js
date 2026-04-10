const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

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

function createWindow() {
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

// ── IPC: folder operations ────────────────────────────────────────────────────

ipcMain.handle('open-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  currentFolder = result.filePaths[0];
  return readFolderTree(currentFolder);
});

ipcMain.handle('read-file', async (_event, filePath) => {
  const resolved = path.resolve(filePath);
  if (currentFolder && !resolved.startsWith(path.resolve(currentFolder))) {
    throw new Error('Access denied: file is outside workspace');
  }
  return fs.readFileSync(resolved, 'utf-8');
});

ipcMain.handle('write-file', async (_event, filePath, content) => {
  const resolved = path.resolve(filePath);
  if (currentFolder && !resolved.startsWith(path.resolve(currentFolder))) {
    throw new Error('Access denied: file is outside workspace');
  }
  fs.writeFileSync(resolved, content, 'utf-8');
  return true;
});

ipcMain.handle('create-workspace', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  currentFolder = result.filePaths[0];
  const entries = fs.readdirSync(currentFolder);
  if (entries.length === 0) {
    const readme = path.join(currentFolder, 'README.md');
    fs.writeFileSync(readme, '# New Workspace\n\nStart writing here.\n', 'utf-8');
  }
  return readFolderTree(currentFolder);
});

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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
