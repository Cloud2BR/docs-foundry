const path = require('path');
const fs = require('fs');

const INVALID_NAME_CHARS = /[<>:"|?*]/;
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/i;

function hasControlCharacters(value) {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (typeof codePoint === 'number' && codePoint <= 31) {
      return true;
    }
  }
  return false;
}

function resolveWorkspacePath(workspaceRoot, candidatePath) {
  const resolvedPath = path.resolve(candidatePath);
  if (!workspaceRoot) return resolvedPath;

  const resolvedRoot = path.resolve(workspaceRoot);

  // Resolve symlinks to catch symlink-based traversal
  let realPath, realRoot;
  try {
    realRoot = fs.realpathSync(resolvedRoot);
  } catch (_) {
    realRoot = resolvedRoot;
  }
  try {
    realPath = fs.realpathSync(resolvedPath);
  } catch (_) {
    // File may not exist yet (create-new-file); fall back to logical check
    realPath = resolvedPath;
  }

  const relativePath = path.relative(realRoot, realPath);
  const isInsideWorkspace =
    relativePath === '' ||
    (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));

  if (!isInsideWorkspace) {
    throw new Error('Access denied: file is outside workspace');
  }

  return resolvedPath;
}

function validateFileName(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('File name is required');
  }
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('File name cannot be empty');
  }
  if (trimmed === '.' || trimmed === '..') {
    throw new Error('File name cannot be a relative path segment');
  }
  if (trimmed.length > 255) {
    throw new Error('File name is too long (max 255 characters)');
  }
  if (trimmed !== name || trimmed.endsWith('.') || trimmed.endsWith(' ')) {
    throw new Error('File name has invalid leading/trailing characters');
  }
  if (hasControlCharacters(trimmed) || INVALID_NAME_CHARS.test(trimmed)) {
    throw new Error('File name contains invalid characters');
  }
  if (trimmed.includes('/') || trimmed.includes('\\')) {
    throw new Error('File name cannot contain path separators');
  }
  if (WINDOWS_RESERVED.test(trimmed.replace(/\.[^.]*$/, ''))) {
    throw new Error('File name is a reserved system name');
  }
  return trimmed;
}

module.exports = {
  resolveWorkspacePath,
  validateFileName
};