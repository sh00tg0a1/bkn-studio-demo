#!/usr/bin/env python3
"""
Duplicate a KWeaver BKN: pull -> patch network.bkn (id, name, title) -> validate -> push.

Requires: kweaver CLI on PATH, network access to platform.

Usage:
  python3 scripts/kweaver_duplicate_bkn.py \\
    --source d736rq3rc6debr2sql60 \\
    --out ref/supply-dup-cx \\
    --id supply-dup-cx \\
    --name '供应链计划协同知识网络-副本' \\
    [--branch main] [--push]

If --push is omitted, stops after validate (dry run).
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path


def run(cmd: list[str], cwd: Path | None = None) -> None:
    print("+", " ".join(cmd), file=sys.stderr)
    subprocess.run(cmd, cwd=cwd, check=True)


def patch_network_bkn(path: Path, new_id: str, new_name: str) -> None:
    raw = path.read_text(encoding="utf-8")
    if not raw.startswith("---"):
        raise ValueError(f"{path}: expected YAML frontmatter starting with ---")

    lines = raw.splitlines(keepends=True)
    # Find end of frontmatter (second --- on its own line)
    end = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end = i
            break
    if end is None:
        raise ValueError(f"{path}: no closing --- for frontmatter")

    fm_lines = lines[1:end]
    body = lines[end + 1 :]

    out_fm: list[str] = []
    seen_id = seen_name = False
    for line in fm_lines:
        if re.match(r"^id:\s*", line):
            out_fm.append(f"id: {new_id}\n")
            seen_id = True
        elif re.match(r"^name:\s*", line):
            # Quoted if needed
            safe = new_name.replace('"', '\\"')
            if any(c in new_name for c in (":", "#", "'", "\n")):
                out_fm.append(f'name: "{safe}"\n')
            else:
                out_fm.append(f"name: {new_name}\n")
            seen_name = True
        else:
            out_fm.append(line)
    if not seen_id:
        out_fm.append(f"id: {new_id}\n")
    if not seen_name:
        safe = new_name.replace('"', '\\"')
        out_fm.append(f'name: "{safe}"\n' if ":" in new_name else f"name: {new_name}\n")

    # First markdown H1 in body -> match new_name
    new_body: list[str] = []
    h1_done = False
    for line in body:
        if not h1_done and line.startswith("# "):
            new_body.append(f"# {new_name}\n")
            h1_done = True
        else:
            new_body.append(line)
    if not h1_done and body:
        new_body.insert(0, f"# {new_name}\n")

    patched = ["---\n"] + out_fm + ["---\n"] + new_body
    path.write_text("".join(patched), encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description="Duplicate BKN via kweaver pull/push")
    ap.add_argument("--source", required=True, help="Source knowledge network id")
    ap.add_argument("--out", required=True, help="Output directory for pulled BKN")
    ap.add_argument("--id", required=True, help="New network id (directory id in network.bkn)")
    ap.add_argument("--name", required=True, help="New display name")
    ap.add_argument("--branch", default="main")
    ap.add_argument("--push", action="store_true", help="Run kweaver bkn push after validate")
    args = ap.parse_args()

    out = Path(args.out).resolve()
    if out.exists():
        print(f"Refusing to overwrite existing path: {out}", file=sys.stderr)
        print("Remove it or pick another --out.", file=sys.stderr)
        return 2

    run(
        [
            "kweaver",
            "bkn",
            "pull",
            args.source,
            str(out),
            "--branch",
            args.branch,
        ]
    )

    nb = out / "network.bkn"
    if not nb.is_file():
        print(f"Missing {nb} after pull", file=sys.stderr)
        return 1
    patch_network_bkn(nb, args.id, args.name)

    run(["kweaver", "bkn", "validate", str(out)])

    if args.push:
        run(["kweaver", "bkn", "push", str(out), "--branch", args.branch])
        print(f"Done. New KN id should match pushed bundle (check platform): {args.id}", file=sys.stderr)
    else:
        print(f"Validated {out}. Run: kweaver bkn push {out} --branch {args.branch}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
