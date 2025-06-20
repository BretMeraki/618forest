import * as fs from 'fs';
import * as path from 'path';
import { URL, fileURLToPath } from 'url';

// Ensure log directory exists
export function ensureLogDir() {
  // Use module location to resolve logs directory, not current working directory
  // This fixes issues when Claude Desktop runs the server from a different working directory
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(moduleDir, '../'); // modules -> project root
  const logDir = path.resolve(projectRoot, 'logs');

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  return logDir;
}

// Return a YYYY-MM-DD dated log path for a given baseName (e.g., 'error')
export function getDatedLogPath(baseName) {
  const dir = ensureLogDir();
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(dir, `${baseName}-${date}.log`);
}

// Write a JSON line record safely (fire-and-forget)
export function writeJsonLine(filePath, payload) {
  try {
    fs.appendFile(filePath, `${JSON.stringify(payload)}\n`, () => {});
  } catch (_) {
    // Ignore write failures to avoid recursive loops
  }
}
