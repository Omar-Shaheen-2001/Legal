import fs from 'fs';

const src = fs.existsSync('dist')
  ? 'dist'
  : fs.existsSync('artifacts/court-session-management/dist')
  ? 'artifacts/court-session-management/dist'
  : null;

if (src && src !== 'dist') {
  fs.cpSync(src, 'dist', { recursive: true });
}
