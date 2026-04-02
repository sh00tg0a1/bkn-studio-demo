import { execFile } from "child_process";
import { promisify } from "util";

const exec = promisify(execFile);

function kweaverBin(): string {
  return process.env.KWEAVER_BIN ?? "kweaver";
}

async function runKweaver(args: string[]): Promise<string> {
  const bin = kweaverBin();
  const { stdout, stderr } = await exec(bin, args, {
    timeout: 30_000,
    maxBuffer: 10 * 1024 * 1024,
    env: process.env,
  });
  if (stderr?.trim()) {
    // CLI may print warnings to stderr; only throw on obvious failure if needed
  }
  return stdout?.toString() ?? "";
}

/** Parse JSON array from stdout; fallback to empty array. */
export async function listBknNetworks(): Promise<unknown[]> {
  const out = await runKweaver(["bkn", "list", "--json"]).catch(() => "[]");
  try {
    const parsed = JSON.parse(out) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function bknQuery(
  bknId: string,
  objectType: string,
  options: { condition?: string; limit?: number },
): Promise<string> {
  const body: Record<string, unknown> = {
    limit: options.limit ?? 20,
  };
  if (options.condition) {
    try {
      body.condition = JSON.parse(options.condition) as unknown;
    } catch {
      body.condition = options.condition;
    }
  }
  const queryJson = JSON.stringify(body);
  return runKweaver(["bkn", "object-type", "query", bknId, objectType, queryJson]);
}

export async function bknSearch(bknId: string, query: string): Promise<string> {
  return runKweaver(["bkn", "search", bknId, "-q", query]);
}

export async function bknSchema(bknId: string): Promise<string> {
  return runKweaver(["bkn", "object-type", "list", bknId]);
}

export async function bknAction(
  bknId: string,
  actionName: string,
  paramsJson: string,
): Promise<string> {
  return runKweaver([
    "bkn",
    "action",
    "execute",
    bknId,
    "--action",
    actionName,
    "--params",
    paramsJson,
  ]);
}
