import { execSync } from 'child_process';
import { cpSync, rmdirSync, rmSync } from 'fs';
import path from 'path';

const BUILD_FILE_REGEXS = [
  /package.json/,
  /package-lock.json/,
  /tsconfig.json/,
  new RegExp(`src(\\${path.sep}.*)?`),
];

export function buildMainApi(tmpPath: string): string {
  console.log("\n[BUILD]: Build started: hackathon-nexus-api\n");
  
  const mainApiPath = path.join(__dirname, '..', '..', '..', '..', 'hackathon-nexus-api');
  const tmpApiPath = path.join(tmpPath, 'hackathon-nexus-api');

  try {
    cpSync(mainApiPath, tmpApiPath, {
      force: true,
      recursive: true,
      filter: (source) =>
        source === mainApiPath || BUILD_FILE_REGEXS.some(regex => regex.test(source)),
    });

    execSync('npm install && npm run build', {
      cwd: tmpApiPath,
      stdio: 'inherit',
    });

    rmSync(path.join(tmpApiPath, 'node_modules'), { force: true, recursive: true });
    rmSync(path.join(tmpApiPath, 'src'), { force: true, recursive: true });

    execSync('npm ci --omit=dev', { cwd: tmpApiPath, stdio: 'inherit' });
  } catch (error) {
    throw new Error(
      `[BUILD]: Failed to build hackathon-nexus-api: ${(error as Error).message}`,
    );
  }

  console.log("\n[BUILD]: Build completed: hackathon-nexus-api\n");

  return tmpApiPath;
}
