import { execSync } from 'child_process';
import { cpSync, rmSync, writeFileSync } from 'fs';
import path from 'path';

const BUILD_FILE_REGEXS = [
  /package.json/,
  /package-lock.json/,
  /tsconfig.json/,
  /tsconfig.app.json/,
  /tsconfig.node.json/,
  /vite.config.ts/,
  /index.html/,
  new RegExp(`public(\\${path.sep}.*)?`),
  new RegExp(`src(\\${path.sep}.*)?`),
];

export function buildFrontend(tmpPath: string): string {
  console.log("\n[BUILD]: Build started: hackathon-nexus-front\n");
  
  const frontPath = path.join(__dirname, '..', '..', '..', '..', 'hackathon-nexus-front');
  const tmpFrontPath = path.join(tmpPath, 'hackathon-nexus-front');

  try {
    cpSync(frontPath, tmpFrontPath, {
      force: true,
      recursive: true,
      filter: (source) =>
        source === frontPath || BUILD_FILE_REGEXS.some(regex => regex.test(source)),
    });

    writeFileSync(path.join(tmpFrontPath, '.env'), 'VITE_API_URL="/api"\n');

    execSync('npm install && npm run build', {
      cwd: tmpFrontPath,
      stdio: 'inherit',
    });
    
    rmSync(path.join(tmpFrontPath, 'node_modules'), { force: true, recursive: true });
    rmSync(path.join(tmpFrontPath, 'public'), { force: true, recursive: true });
    rmSync(path.join(tmpFrontPath, 'src'), { force: true, recursive: true });
  } catch (error) {
    throw new Error(
      `[BUILD]: Failed to build hackathon-nexus-front: ${(error as Error).message}`,
    );
  }

  console.log("\n[BUILD]: Build completed: hackathon-nexus-front\n");

  return tmpFrontPath;
}
