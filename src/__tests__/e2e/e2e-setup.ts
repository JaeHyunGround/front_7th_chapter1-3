import fs from 'fs';
import path from 'path';

export default async function E2ESetup() {
  const rootDir = process.cwd();
  const dbDir = path.join(rootDir, 'src', '__mocks__', 'response');

  const dbPath = path.join(dbDir, 'e2e.json');
  const seedPath = path.join(dbDir, 'e2e-default.json');

  fs.copyFileSync(seedPath, dbPath);
}
