import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  listArtifacts,
  listResources,
  listWorkspaces,
  readResource,
  saveResource,
  writeArtifact,
} from "@/lib/workspace";

let tmpRoot: string;

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "bkn-studio-test-"));
  process.env.BKN_STUDIO_DIR = tmpRoot;
});

afterEach(async () => {
  delete process.env.BKN_STUDIO_DIR;
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

describe("workspace", () => {
  it("creates workspace and lists it", async () => {
    const cfg = await createWorkspace("demo-ws", "kn-test");
    expect(cfg.name).toBe("demo-ws");
    expect(cfg.bknId).toBe("kn-test");
    const list = await listWorkspaces();
    expect(list.some((w) => w.name === "demo-ws")).toBe(true);
    const again = await getWorkspace("demo-ws");
    expect(again.bknId).toBe("kn-test");
  });

  it("accepts Chinese workspace name", async () => {
    const cfg = await createWorkspace("供应链演示", "kn-test");
    expect(cfg.name).toBe("供应链演示");
    const list = await listWorkspaces();
    expect(list.some((w) => w.name === "供应链演示")).toBe(true);
  });

  it("rejects invalid name", async () => {
    await expect(createWorkspace("", "x")).rejects.toThrow();
    await expect(createWorkspace("a/b", "x")).rejects.toThrow();
    await expect(createWorkspace("..", "x")).rejects.toThrow();
    await expect(createWorkspace("  ", "x")).rejects.toThrow();
  });

  it("saves resource and reads back", async () => {
    await createWorkspace("r1", "kn-1");
    await saveResource("r1", "note.txt", Buffer.from("hello"));
    const files = await listResources("r1");
    expect(files.map((f) => f.name)).toContain("note.txt");
    const text = await readResource("r1", "note.txt");
    expect(text).toBe("hello");
  });

  it("writes artifact and lists", async () => {
    await createWorkspace("a1", "kn-1");
    await writeArtifact("a1", "out.md", "# hi");
    const arts = await listArtifacts("a1");
    expect(arts.some((a) => a.name === "out.md")).toBe(true);
  });

  it("deletes workspace", async () => {
    await createWorkspace("d1", "kn-1");
    await deleteWorkspace("d1");
    const list = await listWorkspaces();
    expect(list.some((w) => w.name === "d1")).toBe(false);
  });
});
