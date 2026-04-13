import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { resolveWorkspacePath, validateFileName } = require('../src/lib/workspace-path');

describe('resolveWorkspacePath', () => {
  it('allows files inside the workspace root', () => {
    const resolved = resolveWorkspacePath('/tmp/docs-foundry', '/tmp/docs-foundry/guides/intro.md');
    expect(resolved).toBe('/tmp/docs-foundry/guides/intro.md');
  });

  it('rejects sibling paths that only share a prefix with the workspace', () => {
    expect(() =>
      resolveWorkspacePath('/tmp/docs-foundry', '/tmp/docs-foundry-evil/intro.md')
    ).toThrow('Access denied: file is outside workspace');
  });

  it('rejects parent directory traversal', () => {
    expect(() =>
      resolveWorkspacePath('/tmp/docs-foundry', '/tmp/docs-foundry/../secret.txt')
    ).toThrow('Access denied: file is outside workspace');
  });
});

describe('validateFileName', () => {
  it('accepts a valid file name', () => {
    expect(validateFileName('readme.md')).toBe('readme.md');
  });

  it('rejects dot path segments', () => {
    expect(() => validateFileName('.')).toThrow('relative path segment');
    expect(() => validateFileName('..')).toThrow('relative path segment');
  });

  it('rejects empty input', () => {
    expect(() => validateFileName('')).toThrow('File name is required');
  });

  it('rejects whitespace-only input', () => {
    expect(() => validateFileName('   ')).toThrow('File name cannot be empty');
  });

  it('rejects names with path separators', () => {
    expect(() => validateFileName('sub/dir.md')).toThrow('path separators');
    expect(() => validateFileName('sub\\dir.md')).toThrow('path separators');
  });

  it('rejects names with null bytes', () => {
    expect(() => validateFileName('file\x00.md')).toThrow('invalid characters');
  });

  it('rejects names longer than 255 characters', () => {
    expect(() => validateFileName('a'.repeat(256))).toThrow('too long');
  });

  it('rejects Windows reserved names', () => {
    expect(() => validateFileName('CON')).toThrow('reserved system name');
    expect(() => validateFileName('prn.txt')).toThrow('reserved system name');
  });

  it('allows names that contain but are not reserved words', () => {
    expect(validateFileName('icon.png')).toBe('icon.png');
    expect(validateFileName('conventional.md')).toBe('conventional.md');
  });
});