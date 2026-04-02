#!/usr/bin/env python3
"""Create the `skill` table in MySQL and insert the 3 PMC demo skills.

Requires env (or export before run):
  SKILLS_DB_HOST   — e.g. 116.63.205.204 or 10.240.1.178
  SKILLS_DB_PASSWORD
Optional: SKILLS_DB_PORT (default 3306), SKILLS_DB_USER (default root),
          SKILLS_DB_NAME (default hd_supply)
"""

import os
import pathlib

import pymysql

CONN = dict(
    host=os.environ.get("SKILLS_DB_HOST", "").strip(),
    port=int(os.environ.get("SKILLS_DB_PORT", "3306")),
    user=os.environ.get("SKILLS_DB_USER", "root").strip(),
    password=os.environ.get("SKILLS_DB_PASSWORD", ""),
    database=os.environ.get("SKILLS_DB_NAME", "hd_supply").strip(),
    charset="utf8mb4",
)

DDL = """
CREATE TABLE IF NOT EXISTS skill (
    skill_id        VARCHAR(60)  NOT NULL PRIMARY KEY COMMENT 'Skill 唯一标识',
    name            VARCHAR(120) NOT NULL             COMMENT '显示名称',
    description     TEXT                              COMMENT '简要描述',
    prd_module      VARCHAR(10)                       COMMENT 'PRD 模块编号 (F2/F3/F4)',
    kn_id           VARCHAR(60)                       COMMENT '关联知识网络 ID',
    related_object_types TEXT                         COMMENT '涉及的对象类 (逗号分隔)',
    related_relations    TEXT                         COMMENT '涉及的关系类 (逗号分隔)',
    rule_count      INT                               COMMENT '规则条数',
    content         LONGTEXT                          COMMENT '完整 SKILL.md 内容'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Agent Skills: PMC 智能问答计算逻辑';
"""

SKILLS = [
    {
        "skill_id": "pmc-shortage-analysis",
        "name": "PMC 缺料与 MRP 分析",
        "description": "缺料量计算、齐套率、PO 交期差异、MRP 投放状态、缺料 TOP-N 排序、PR/PO 转换率",
        "prd_module": "F2",
        "kn_id": "supply-dup-cx",
        "related_object_types": "forecast,mrp_plan_order,inventory,pr,po",
        "related_relations": "forecast_to_mrp,mrp_to_inventory,mrp_to_pr,pr_to_po",
        "rule_count": 6,
    },
    {
        "skill_id": "pmc-delivery-risk",
        "name": "PMC 交期与风险推理",
        "description": "关键路径最早完工日、承诺交期判断、交付卡点识别、风险物料分级、备货周期拆解、月度问题产品扫描、延迟敏感度",
        "prd_module": "F3",
        "kn_id": "supply-dup-cx",
        "related_object_types": "sales_order,product,forecast,mrp_plan_order,inventory,po,supplier",
        "related_relations": "sales_order_to_product,product_to_forecast,forecast_to_mrp,mrp_to_inventory,mrp_to_pr,pr_to_po,po_to_supplier",
        "rule_count": 7,
    },
    {
        "skill_id": "pmc-producibility",
        "name": "PMC 可生产量与日报",
        "description": "多层 BOM 展开、可用量(含替代料与在途)、最大可生产量、最小补货量、生产计划日报聚合、数据来源标注",
        "prd_module": "F4",
        "kn_id": "supply-dup-cx",
        "related_object_types": "product,bom,material,inventory,po,forecast,mrp_plan_order",
        "related_relations": "product_to_bom,bom_to_material,product_to_forecast,forecast_to_mrp",
        "rule_count": 6,
    },
]


def main():
    if not CONN["host"]:
        raise SystemExit(
            "Set SKILLS_DB_HOST and SKILLS_DB_PASSWORD (see script docstring).",
        )
    conn = pymysql.connect(**CONN)
    try:
        with conn.cursor() as cur:
            cur.execute(DDL)
            conn.commit()
            print("✓ Table `skill` created (or already exists)")

            for s in SKILLS:
                skill_md = _read_skill_md(s["skill_id"])
                cur.execute(
                    """
                    REPLACE INTO skill
                        (skill_id, name, description, prd_module, kn_id,
                         related_object_types, related_relations, rule_count, content)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        s["skill_id"],
                        s["name"],
                        s["description"],
                        s["prd_module"],
                        s["kn_id"],
                        s["related_object_types"],
                        s["related_relations"],
                        s["rule_count"],
                        skill_md,
                    ),
                )
                print(f"  ✓ Inserted {s['skill_id']}")

            conn.commit()
            print(f"\n✓ {len(SKILLS)} skills inserted into {CONN['database']}.skill")

            cur.execute("SELECT skill_id, name, prd_module, rule_count FROM skill")
            rows = cur.fetchall()
            print("\n--- Verification ---")
            for r in rows:
                print(f"  {r[0]:30s}  {r[1]:20s}  {r[2]:4s}  rules={r[3]}")
    finally:
        conn.close()


def _read_skill_md(skill_id: str) -> str:
    p = (
        pathlib.Path(__file__).resolve().parent.parent
        / ".cursor"
        / "skills"
        / skill_id
        / "SKILL.md"
    )
    return p.read_text(encoding="utf-8") if p.exists() else ""


if __name__ == "__main__":
    main()
