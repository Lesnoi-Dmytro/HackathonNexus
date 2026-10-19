import { buildMainApi } from "./hackathon-nexus-api";
import { buildFrontend } from "./hackathon-nexus-front";
import path from "path";

interface BuildResult {
  apiPath: string;
  frontPath: string;
}

const TMP_PATH = path.join(process.cwd(), 'build_tmp');

export function buildProjects(): BuildResult {
  const apiPath = buildMainApi(TMP_PATH);
  const frontPath = buildFrontend(TMP_PATH);

  return { apiPath, frontPath };
}
