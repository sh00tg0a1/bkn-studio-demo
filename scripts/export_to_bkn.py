#!/usr/bin/env python3
"""Convert kweaver bkn export JSON → BKN directory with new id/name, then validate + push."""
import json, os, sys, subprocess

EXPORT = "/Users/cx/.cursor/projects/Users-cx-Work-kweaver-ai-bkn-studio-demo/agent-tools/9c1c5dd4-ef0d-40bd-83d3-672f88da0f41.txt"
OUT = "/Users/cx/Work/kweaver-ai/bkn-studio-demo/ref/supply-dup-cx"
NEW_ID = "supply-dup-cx"
NEW_NAME = "供应链计划协同知识网络-副本"

with open(EXPORT, encoding="utf-8") as f:
    data = json.load(f)

os.makedirs(f"{OUT}/object_types", exist_ok=True)
os.makedirs(f"{OUT}/relation_types", exist_ok=True)
os.makedirs(f"{OUT}/concept_groups", exist_ok=True)

# network.bkn
tags_str = "[" + ", ".join(data.get("tags", [])) + "]"
ot_ids = [ot["id"] for ot in data.get("object_types", [])]
rt_ids = [rt["id"] for rt in data.get("relation_types", [])]
cg_ids = [cg["id"] for cg in data.get("concept_groups", [])]

lines = [
    "---",
    "type: knowledge_network",
    f"id: {NEW_ID}",
    f"name: {NEW_NAME}",
    f"tags: {tags_str}",
    "branch: main",
    "business_domain: bd_public",
    "---",
    "",
    f"# {NEW_NAME}",
    "",
    data.get("comment", ""),
    "",
    "## Network Overview",
    "",
    "- **ObjectTypes** (object_types/):",
]
for i in ot_ids:
    lines.append(f"  - {i}")
lines.append("- **RelationTypes** (relation_types/):")
for i in rt_ids:
    lines.append(f"  - {i}")
lines.append("- **ConceptGroups** (concept_groups/):")
for i in cg_ids:
    lines.append(f"  - {i}")
lines.append("")

with open(f"{OUT}/network.bkn", "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

# object_types
for ot in data.get("object_types", []):
    rows = []
    for p in ot.get("data_properties", []):
        mapped = p.get("mapped_field", {}).get("name", "")
        desc = (p.get("comment") or "").replace("|", "/")
        rows.append(f"| {p['name']} | {p.get('display_name','')} | {p.get('type','')} | {mapped} | {desc} |")
    ptable = "\n".join(rows)
    pk = ", ".join(ot.get("primary_keys", []))
    dk = ot.get("display_key", "")
    ds = ot.get("data_source", {})
    tags = "[" + ", ".join(ot.get("tags", [])) + "]"
    bkn = "\n".join([
        "---",
        "type: object_type",
        f"id: {ot['id']}",
        f"name: {ot['name']}",
        f"tags: {tags}",
        "data_source:",
        f"  type: {ds.get('type','')}",
        f"  id: {ds.get('id','')}",
        f"  name: {ds.get('name','')}",
        f"primary_keys: [{pk}]",
        f"display_key: {dk}",
        "---",
        "",
        f"## ObjectType: {ot['name']}",
        "",
        ot.get("comment", ""),
        "",
        "### Data Properties",
        "",
        "| name | display_name | type | mapped_field | description |",
        "|------|-------------|------|-------------|-------------|",
        ptable,
        "",
    ])
    with open(f"{OUT}/object_types/{ot['id']}.bkn", "w", encoding="utf-8") as f:
        f.write(bkn)

# relation_types
for rt in data.get("relation_types", []):
    src = rt.get("source_object_type", {}).get("id", "")
    tgt = rt.get("target_object_type", {}).get("id", "")
    tags = "[" + ", ".join(rt.get("tags", [])) + "]"
    mappings = rt.get("data_property_mapping", [])
    mrows = []
    for m in mappings:
        mrows.append(f"| {m.get('source','')} | {m.get('target','')} |")
    mtable = "\n".join(mrows) if mrows else "| - | - |"
    bkn = "\n".join([
        "---",
        "type: relation_type",
        f"id: {rt['id']}",
        f"name: {rt['name']}",
        f"tags: {tags}",
        f"source: {src}",
        f"target: {tgt}",
        "---",
        "",
        f"## RelationType: {rt['name']}",
        "",
        rt.get("comment", ""),
        "",
        "### Property Mapping",
        "",
        "| source | target |",
        "|--------|--------|",
        mtable,
        "",
    ])
    with open(f"{OUT}/relation_types/{rt['id']}.bkn", "w", encoding="utf-8") as f:
        f.write(bkn)

# concept_groups
for cg in data.get("concept_groups", []):
    tags = "[" + ", ".join(cg.get("tags", [])) + "]"
    bkn = "\n".join([
        "---",
        "type: concept_group",
        f"id: {cg['id']}",
        f"name: {cg['name']}",
        f"tags: {tags}",
        "---",
        "",
        f"## ConceptGroup: {cg['name']}",
        "",
        cg.get("comment", ""),
        "",
    ])
    with open(f"{OUT}/concept_groups/{cg['id']}.bkn", "w", encoding="utf-8") as f:
        f.write(bkn)

print("Generated BKN directory:")
for root, dirs, files in os.walk(OUT):
    for fn in sorted(files):
        print(f"  {os.path.join(root, fn)}")
