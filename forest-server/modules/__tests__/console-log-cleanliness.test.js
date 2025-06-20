import fs from 'fs';
import path from 'path';

/**
 * Recursively collect all JS/TS files under a directory, excluding node_modules and logs.
 * @param {string} dir
 * @param {string[]} fileList
 * @returns {string[]}
 */
function collectSourceFiles(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Skip common non-source directories
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'logs', 'coverage', '__tests__', 'tests', 'demo', 'demos', 'tools'].includes(entry.name)) {
        continue;
      }
      collectSourceFiles(fullPath, fileList);
    } else if (entry.isFile()) {
      if (fullPath.endsWith('.js') || fullPath.endsWith('.mjs') || fullPath.endsWith('.cjs')) {
        // Exclude individual non-production files (tests, demos, tooling)
        const rel = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
        if (
          /__tests__/.test(rel) ||
          /\/tests\//.test(rel) ||
          /\/demo/.test(rel) ||
          /\/tools\//.test(rel) ||
          /test[-_.]/.test(path.basename(rel)) ||
          rel.endsWith('.test.js')
        ) {
          continue;
        }
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

describe('Codebase cleanliness – no console.log left behind', () => {
  it('contains zero active console.log statements', () => {
    const repoRoot = process.cwd(); // Jest runs from repository root
    const allFiles = collectSourceFiles(repoRoot);

    const offending = [];
    const logRegex = /console\.log\s*\(/;

    for (const file of allFiles) {
      const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
      lines.forEach((line, idx) => {
        if (!logRegex.test(line)) return;
        // Trim leading whitespace
        const trimmed = line.trimStart();
        // Skip if it is inside a single-line comment
        if (trimmed.startsWith('//')) return;
        offending.push(`${path.relative(repoRoot, file)}:${idx + 1}`);
      });
    }

    expect(offending).toEqual([]);
  });
}); 