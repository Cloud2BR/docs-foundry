import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { resolveWorkspacePath } = require('../src/lib/workspace-path');

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
});