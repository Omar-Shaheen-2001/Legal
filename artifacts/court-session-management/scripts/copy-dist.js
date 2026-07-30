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
  if (fs.existsSync(cand) && fs.existsSync(path.join(cand, 'index.html'))) {
    src = cand;
    break;
  }
}

if (src && src !== 'dist') {
  fs.cpSync(src, 'dist', { recursive: true });
}
