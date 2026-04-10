import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Project structure', () => {
  it('has package.json with correct name', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8'));
    expect(pkg.name).toBe('docfoundry');
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
    expect(main).toContain('Access denied: file is outside workspace');
  });
});
