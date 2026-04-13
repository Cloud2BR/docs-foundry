import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Project structure', () => {
  it('has package.json with correct name', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8'));
    expect(pkg.name).toBe('docfoundry');
  });

  it('uses the current first-version number', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8'));
    expect(pkg.version).toBe('0.0.1');
  });

  it('has main entry point', () => {
    expect(fs.existsSync(path.resolve('src/main.js'))).toBe(true);
  });

  it('has preload script', () => {
    expect(fs.existsSync(path.resolve('src/preload.js'))).toBe(true);
  });

  it('has renderer index.html', () => {
    expect(fs.existsSync(path.resolve('src/renderer/index.html'))).toBe(true);
  });

  it('has build icon', () => {
    expect(fs.existsSync(path.resolve('build/icon.svg'))).toBe(true);
  });

  it('has markdown module', () => {
    expect(fs.existsSync(path.resolve('src/renderer/markdown.js'))).toBe(true);
  });

  it('has workspace-path module', () => {
    expect(fs.existsSync(path.resolve('src/lib/workspace-path.js'))).toBe(true);
  });
});

describe('Security', () => {
  it('renderer uses contextIsolation', () => {
    const main = fs.readFileSync(path.resolve('src/main.js'), 'utf-8');
    expect(main).toContain('contextIsolation: true');
  });

  it('renderer disables nodeIntegration', () => {
    const main = fs.readFileSync(path.resolve('src/main.js'), 'utf-8');
    expect(main).toContain('nodeIntegration: false');
  });

  it('preload uses contextBridge', () => {
    const preload = fs.readFileSync(path.resolve('src/preload.js'), 'utf-8');
    expect(preload).toContain('contextBridge.exposeInMainWorld');
  });

  it('main process validates file paths', () => {
    const main = fs.readFileSync(path.resolve('src/main.js'), 'utf-8');
    const workspacePath = fs.readFileSync(path.resolve('src/lib/workspace-path.js'), 'utf-8');
    expect(main).toContain("const { resolveWorkspacePath, validateFileName } = require('./lib/workspace-path');");
    expect(workspacePath).toContain('Access denied: file is outside workspace');
  });

  it('workspace-path resolves symlinks for traversal protection', () => {
    const wp = fs.readFileSync(path.resolve('src/lib/workspace-path.js'), 'utf-8');
    expect(wp).toContain('realpathSync');
  });

  it('main process validates file names on create and rename', () => {
    const main = fs.readFileSync(path.resolve('src/main.js'), 'utf-8');
    expect(main).toContain('validateFileName(fileName)');
    expect(main).toContain('validateFileName(folderName)');
    expect(main).toContain('validateFileName(newName)');
  });

  it('file watcher sanitizes file names', () => {
    const main = fs.readFileSync(path.resolve('src/main.js'), 'utf-8');
    expect(main).toContain('function hasControlCharacters(value)');
    expect(main).toContain('codePoint <= 31');
  });

  it('main process tracks dirty editor state', () => {
    const main = fs.readFileSync(path.resolve('src/main.js'), 'utf-8');
    expect(main).toContain("ipcMain.on('set-dirty-state'");
  });

  it('preload validates menu event channels', () => {
    const preload = fs.readFileSync(path.resolve('src/preload.js'), 'utf-8');
    expect(preload).toContain('validChannels');
  });
});

describe('Feature surface', () => {
  it('main process has workspace search handler', () => {
    const main = fs.readFileSync(path.resolve('src/main.js'), 'utf-8');
    expect(main).toContain("ipcMain.handle('search-workspace'");
  });

  it('main process has file CRUD handlers', () => {
    const main = fs.readFileSync(path.resolve('src/main.js'), 'utf-8');
    expect(main).toContain("ipcMain.handle('create-new-file'");
    expect(main).toContain("ipcMain.handle('delete-file'");
    expect(main).toContain("ipcMain.handle('rename-file'");
  });

  it('main process has export HTML handler', () => {
    const main = fs.readFileSync(path.resolve('src/main.js'), 'utf-8');
    expect(main).toContain("ipcMain.handle('export-html'");
  });

  it('main process has export PDF handler', () => {
    const main = fs.readFileSync(path.resolve('src/main.js'), 'utf-8');
    expect(main).toContain("ipcMain.handle('export-pdf'");
    expect(main).toContain('printToPDF');
  });

  it('main process has git status and diff handlers', () => {
    const main = fs.readFileSync(path.resolve('src/main.js'), 'utf-8');
    expect(main).toContain("ipcMain.handle('get-git-status'");
    expect(main).toContain("ipcMain.handle('get-git-diff'");
    expect(main).toContain("git', ['-C'");
  });

  it('main process supports dropped file import into the workspace', () => {
    const main = fs.readFileSync(path.resolve('src/main.js'), 'utf-8');
    expect(main).toContain("ipcMain.handle('import-files-into-workspace'");
    expect(main).toContain('fs.copyFileSync');
  });

  it('main process has file watcher', () => {
    const main = fs.readFileSync(path.resolve('src/main.js'), 'utf-8');
    expect(main).toContain('startFileWatcher');
  });

  it('main process builds native app menu', () => {
    const main = fs.readFileSync(path.resolve('src/main.js'), 'utf-8');
    expect(main).toContain('buildAppMenu');
    expect(main).toContain('Menu.setApplicationMenu');
  });

  it('preload exposes all required APIs', () => {
    const preload = fs.readFileSync(path.resolve('src/preload.js'), 'utf-8');
    expect(preload).toContain('searchWorkspace');
    expect(preload).toContain('getAllFiles');
    expect(preload).toContain('createNewFile');
    expect(preload).toContain('deleteFile');
    expect(preload).toContain('renameFile');
    expect(preload).toContain('exportHtml');
    expect(preload).toContain('exportPdf');
    expect(preload).toContain('getGitStatus');
    expect(preload).toContain('getGitDiff');
    expect(preload).toContain('importFilesIntoWorkspace');
    expect(preload).toContain('onWorkspaceChanged');
  });

  it('renderer has multi-tab support', () => {
    const renderer = fs.readFileSync(path.resolve('src/renderer/renderer.js'), 'utf-8');
    expect(renderer).toContain('function createTab');
    expect(renderer).toContain('function activateTab');
    expect(renderer).toContain('function closeTab');
    expect(renderer).toContain('function cycleTabs');
  });

  it('HTML includes command palette', () => {
    const html = fs.readFileSync(path.resolve('src/renderer/index.html'), 'utf-8');
    expect(html).toContain('command-palette');
  });

  it('HTML includes workspace search panel', () => {
    const html = fs.readFileSync(path.resolve('src/renderer/index.html'), 'utf-8');
    expect(html).toContain('search-panel');
  });

  it('HTML includes find/replace bar', () => {
    const html = fs.readFileSync(path.resolve('src/renderer/index.html'), 'utf-8');
    expect(html).toContain('find-bar');
    expect(html).toContain('replace-row');
  });

  it('HTML includes document outline', () => {
    const html = fs.readFileSync(path.resolve('src/renderer/index.html'), 'utf-8');
    expect(html).toContain('outline-panel');
  });

  it('HTML includes status bar', () => {
    const html = fs.readFileSync(path.resolve('src/renderer/index.html'), 'utf-8');
    expect(html).toContain('status-bar');
  });

  it('HTML includes keyboard shortcuts overlay', () => {
    const html = fs.readFileSync(path.resolve('src/renderer/index.html'), 'utf-8');
    expect(html).toContain('shortcuts-overlay');
  });

  it('HTML includes a titled input dialog', () => {
    const html = fs.readFileSync(path.resolve('src/renderer/index.html'), 'utf-8');
    expect(html).toContain('input-dialog-title');
    expect(html).toContain('input-dialog-help');
    expect(html).toContain('aria-modal="true"');
  });

  it('renderer styles preserve the hidden attribute for workspace and overlays', () => {
    const css = fs.readFileSync(path.resolve('src/renderer/styles.css'), 'utf-8');
    expect(css).toContain('[hidden]');
    expect(css).toContain('display: none !important;');
  });

  it('HTML includes diff and broken link overlays', () => {
    const html = fs.readFileSync(path.resolve('src/renderer/index.html'), 'utf-8');
    expect(html).toContain('diff-overlay');
    expect(html).toContain('link-check-overlay');
    expect(html).toContain('link-suggestions');
  });

  it('HTML enables spellcheck in the editor', () => {
    const html = fs.readFileSync(path.resolve('src/renderer/index.html'), 'utf-8');
    expect(html).toContain('spellcheck="true"');
  });

  it('HTML has ARIA labels on interactive regions', () => {
    const html = fs.readFileSync(path.resolve('src/renderer/index.html'), 'utf-8');
    expect(html).toContain('aria-label="File explorer"');
    expect(html).toContain('aria-label="Markdown editor"');
    expect(html).toContain('aria-label="Markdown preview"');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tree"');
    expect(html).toContain('role="search"');
  });

  it('markdown module exports slugify for heading IDs', () => {
    const md = fs.readFileSync(path.resolve('src/renderer/markdown.js'), 'utf-8');
    expect(md).toContain('slugify');
    expect(md).toContain('id=');
  });

  it('markdown module blocks dangerous URL protocols', () => {
    const md = fs.readFileSync(path.resolve('src/renderer/markdown.js'), 'utf-8');
    expect(md).toContain("blob:");
    expect(md).toContain("file:");
    expect(md).toContain("data:image/svg+xml");
  });

  it('markdown module supports Mermaid preview blocks', () => {
    const md = fs.readFileSync(path.resolve('src/renderer/markdown.js'), 'utf-8');
    expect(md).toContain('mermaid-block');
    expect(md).toContain("toLowerCase() === 'mermaid'");
  });

  it('markdown module renders footnote definitions', () => {
    const md = fs.readFileSync(path.resolve('src/renderer/markdown.js'), 'utf-8');
    expect(md).toContain('collectFootnotes');
    expect(md).toContain('section class="footnotes"');
  });

  it('package.json has prepack script for icon generation', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8'));
    expect(pkg.scripts.prepack).toContain('generate-icons');
  });

  it('package.json includes Mermaid as a runtime dependency', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8'));
    expect(pkg.dependencies.mermaid).toBeTruthy();
  });

  it('release workflow generates icons before building installers', () => {
    const workflow = fs.readFileSync(path.resolve('.github/workflows/release-desktop.yml'), 'utf-8');
    expect(workflow).toContain('Generate icons');
    expect(workflow).toContain('bash build/generate-icons.sh');
  });

  it('renderer includes git diff, broken links, and PDF export features', () => {
    const renderer = fs.readFileSync(path.resolve('src/renderer/renderer.js'), 'utf-8');
    expect(renderer).toContain('openGitDiff');
    expect(renderer).toContain('runBrokenLinkCheck');
    expect(renderer).toContain('exportCurrentPdf');
    expect(renderer).toContain('renderMermaidDiagrams');
    expect(renderer).toContain('handleExternalDrop');
  });

  it('renderer resolves and prioritizes the input dialog correctly', () => {
    const renderer = fs.readFileSync(path.resolve('src/renderer/renderer.js'), 'utf-8');
    expect(renderer).toContain('let inputDialogState = null;');
    expect(renderer).toContain('if (!inputDialog.hidden) { closeInputDialog(null); return; }');
    expect(renderer).toContain('function hideBlockingOverlays()');
    expect(renderer).toContain('inputDialogState = { resolve, cleanup };');
    expect(renderer).toContain('resolve(result);');
  });

  it('renderer provides helper copy for file, folder, and rename dialogs', () => {
    const renderer = fs.readFileSync(path.resolve('src/renderer/renderer.js'), 'utf-8');
    expect(renderer).toContain('Create new file');
    expect(renderer).toContain('Create new folder');
    expect(renderer).toContain('Rename item');
    expect(renderer).toContain('helpText');
    expect(renderer).toContain('inputDialogHelp.textContent = helpText;');
  });

  it('renderer loads Mermaid from a local packaged asset instead of a CDN', () => {
    const renderer = fs.readFileSync(path.resolve('src/renderer/renderer.js'), 'utf-8');
    expect(renderer).toContain("../../node_modules/mermaid/dist/mermaid.min.js");
    expect(renderer).not.toContain('cdn.jsdelivr.net');
  });

  it('renderer guards against missing preload API', () => {
    const renderer = fs.readFileSync(path.resolve('src/renderer/renderer.js'), 'utf-8');
    expect(renderer).toContain("if (!api)");
    expect(renderer).toContain("failed to initialise");
  });

  it('renderer error-handles the create-workspace and open-folder flows', () => {
    const renderer = fs.readFileSync(path.resolve('src/renderer/renderer.js'), 'utf-8');
    expect(renderer).toContain("Could not create workspace:");
    expect(renderer).toContain("Could not open folder:");
  });

  it('renderer warns when creating files or folders without a workspace', () => {
    const renderer = fs.readFileSync(path.resolve('src/renderer/renderer.js'), 'utf-8');
    expect(renderer).toContain('Open a workspace first before creating files.');
    expect(renderer).toContain('Open a workspace first before creating folders.');
  });

  it('main process validates mainWindow before showing dialogs', () => {
    const main = fs.readFileSync(path.resolve('src/main.js'), 'utf-8');
    expect(main).toContain('mainWindow.isDestroyed()');
    expect(main).toContain('Application window is not ready');
  });

  it('main process guards file/folder creation against missing workspace', () => {
    const main = fs.readFileSync(path.resolve('src/main.js'), 'utf-8');
    expect(main).toContain("if (!currentFolder) throw new Error('No workspace is open");
  });
});
