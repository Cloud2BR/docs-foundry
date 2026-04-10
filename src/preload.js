const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('docfoundry', {
  appName: 'DocFoundry',
  version: '0.1.0',
  openFolder: () => ipcRenderer.invoke('open-folder'),
  createWorkspace: () => ipcRenderer.invoke('create-workspace'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content)
});
