const { contextBridge, ipcRenderer } = require('electron');

// Sandboxed preloads (Electron 20+) can only require('electron').
// App metadata is fetched from the main process via IPC instead.
contextBridge.exposeInMainWorld('docfoundry', {
  appName: 'Docs Foundry',
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // Workspace
  openFolder: () => ipcRenderer.invoke('open-folder'),
  createWorkspace: () => ipcRenderer.invoke('create-workspace'),
  refreshTree: () => ipcRenderer.invoke('refresh-tree'),

  // File I/O
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),

  // File operations
  createNewFile: (parentDir, fileName) => ipcRenderer.invoke('create-new-file', parentDir, fileName),
  createNewFolder: (parentDir, folderName) => ipcRenderer.invoke('create-new-folder', parentDir, folderName),
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),
  renameFile: (oldPath, newName) => ipcRenderer.invoke('rename-file', oldPath, newName),

  // Search
  searchWorkspace: (query) => ipcRenderer.invoke('search-workspace', query),
  getAllFiles: () => ipcRenderer.invoke('get-all-files'),

  // Export
  exportHtml: (htmlContent, suggestedName) => ipcRenderer.invoke('export-html', htmlContent, suggestedName),
  exportPdf: (htmlContent, suggestedName) => ipcRenderer.invoke('export-pdf', htmlContent, suggestedName),

  // Git
  getGitStatus: () => ipcRenderer.invoke('get-git-status'),
  getGitDiff: (filePath) => ipcRenderer.invoke('get-git-diff', filePath),

  // File import
  importFilesIntoWorkspace: (sources, targetDir) => ipcRenderer.invoke('import-files-into-workspace', sources, targetDir),

  // Dirty state
  setDirtyState: (isDirty) => ipcRenderer.send('set-dirty-state', isDirty),

  // Close flow
  onRequestSaveAndClose: (callback) => ipcRenderer.on('request-save-and-close', callback),
  confirmSaveAndClose: (didSave) => ipcRenderer.invoke('confirm-save-and-close', didSave),

  // Menu events
  onMenuEvent: (channel, callback) => {
    const validChannels = [
      'menu-open-folder', 'menu-new-file', 'menu-save', 'menu-export-html',
      'menu-export-pdf', 'menu-git-diff', 'menu-check-links',
      'menu-find', 'menu-replace', 'menu-command-palette', 'menu-workspace-search',
      'menu-toggle-sidebar', 'menu-toggle-outline', 'menu-zen-mode', 'menu-shortcuts'
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    }
  },

  // File watcher
  onWorkspaceChanged: (callback) => ipcRenderer.on('workspace-changed', (_event, data) => callback(data))
});
