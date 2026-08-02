import fs from 'fs';
import path from 'path';

const candidates = [
  'dist',
  'artifacts/court-session-management/dist',
  '../court-session-management/dist',
  '../../artifacts/court-session-management/dist'
];

let src = null;
for (const cand of candidates) {
  const resolved = path.resolve(cand);
  if (fs.existsSync(resolved) && fs.existsSync(path.join(resolved, 'index.html'))) {
    src = resolved;
    break;
  }
}

const targetDist = path.resolve('dist');

if (src) {
  if (src !== targetDist) {
    fs.mkdirSync(targetDist, { recursive: true });
    fs.cpSync(src, targetDist, { recursive: true });
    console.log(`[copy-dist] Successfully copied build output from ${src} to ${targetDist}`);
  } else {
    console.log(`[copy-dist] Build output already at ${targetDist}`);
  }
} else {
  console.error('[copy-dist] Error: Could not find build output index.html in candidates:', candidates);
  process.exit(1);
}

