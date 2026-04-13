const path = require('path');

function resolveWorkspacePath(workspaceRoot, candidatePath) {
  const resolvedPath = path.resolve(candidatePath);
  if (!workspaceRoot) return resolvedPath;

  const resolvedRoot = path.resolve(workspaceRoot);
  const relativePath = path.relative(resolvedRoot, resolvedPath);
  const isInsideWorkspace =
    relativePath === '' ||
    (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));

  if (!isInsideWorkspace) {
    throw new Error('Access denied: file is outside workspace');
  }

  return resolvedPath;
}

module.exports = {
  resolveWorkspacePath
};