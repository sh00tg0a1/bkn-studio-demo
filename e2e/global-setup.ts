import fs from "fs";
import path from "path";

/**
 * Prepares an isolated BKN_STUDIO_DIR for E2E so the dev server never touches ~/.bkn-studio.
 */
export default async function globalSetup() {
  const root = path.join(process.cwd(), "e2e", ".studio");
  const ws = path.join(root, "e2etest");
  const now = new Date().toISOString();

  for (const sub of [
    "skills",
    "resources",
    "artifacts",
    "conversations",
    "intermediate",
  ]) {
    fs.mkdirSync(path.join(ws, sub), { recursive: true });
  }

  fs.writeFileSync(
    path.join(ws, "config.json"),
    JSON.stringify(
      {
        name: "e2etest",
        bknId: "e2e-bkn",
        createdAt: now,
        updatedAt: now,
      },
      null,
      2,
    ),
    "utf-8",
  );

  fs.writeFileSync(
    path.join(root, "workspaces.json"),
    JSON.stringify(
      [{ name: "e2etest", bknId: "e2e-bkn", createdAt: now }],
      null,
      2,
    ),
    "utf-8",
  );
}
