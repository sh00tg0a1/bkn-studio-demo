---
name: pmc-producibility
description: >-
  Encodes PMC producibility and reporting logic: multi-level BOM explode with
  rolled-up qty, available qty incl. substitutes and open PO, max build,
  min replenishment for target build, daily report aggregation, mandatory
  provenance. Use when the user asks about 可生产台数, 最大可生产, 补货,
  生产计划日报, 飞书简报, or F4 reports (PRD F4).
---

# PMC Producibility & Report Logic

Executable rules for **F4** and **可生产数量** questions. All numeric outputs require provenance (PRD §6.2 / §7.2 / §8.2).

## Knowledge Network Binding

KN: **supply-dup-cx** (供应链计划协同知识网络-副本)

BOM expansion and availability check traverse this path:

```
product ──[product_to_bom]──▶ bom ──[bom_to_material]──▶ material
   │                          │                              │
   │  material_number         │  parent_material_code        │  material_code
   │  == bom_material_code    │  material_code (子件)        │  == inventory.material_code
   │                          │  alt_group_no (替代组)       │
   │                          │  alt_priority (0=主料)       ▼
   │                          │                          inventory
   │                          │                              │
   │                          │                              │  available_inventory_qty
   │                          │                              │  inventory_qty
   └──[product_to_forecast]──▶ forecast ──[forecast_to_mrp]──▶ mrp_plan_order
```

### Object-type field map

| Rule concept | OT | Field | Display |
|---|---|---|---|
| 产品编码 | `product` | `material_number` | 产品编码 |
| 产品名称 | `product` | `material_name` | 产品名称 |
| BOM产品编码 | `bom` | `bom_material_code` | 产品编码 |
| 父件编码 | `bom` | `parent_material_code` | 父件编码 |
| 子件编码 | `bom` | `material_code` | 子件编码 |
| BOM版本 | `bom` | `bom_version` | BOM版本 |
| 替代组号 | `bom` | `alt_group_no` | 替代组号 |
| 替代优先级 | `bom` | `alt_priority` | 替代优先级 (0=主料) |
| 物料编码 | `material` | `material_code` | 物料编码 |
| 物料名称 | `material` | `material_name` | 物料名称 |
| 物料类型 | `material` | `material_type` | 物料类型 |
| 可用库存 | `inventory` | `available_inventory_qty` | 可用库存数量 |
| 总库存 | `inventory` | `inventory_qty` | 库存数量 |
| 仓库 | `inventory` | `warehouse` | 仓库 |
| PO到货日 | `po` | `deliverdate` | 计划到货日期 |
| PO物料编码 | `po` | `material_number` | 物料编码 |
| 预测单号 | `forecast` | `billno` | 预测单号 |
| 需求数量 | `forecast` | `qty` | 需求数量 |

### Query patterns

```bash
# 查产品 BOM (所有子件)
kweaver bkn object-type query supply-dup-cx bom \
  '{"limit":30,"condition":{"field":"bom_material_code","operation":"==","value":"<产品编码>"}}'

# 递归展开: 查某父件的下级子件
kweaver bkn object-type query supply-dup-cx bom \
  '{"limit":30,"condition":{"field":"parent_material_code","operation":"==","value":"<父件编码>"}}'

# 查子件库存
kweaver bkn object-type query supply-dup-cx inventory \
  '{"limit":10,"condition":{"field":"material_code","operation":"==","value":"<子件编码>"}}'

# 查替代料 (同替代组号的其他物料)
kweaver bkn object-type query supply-dup-cx bom \
  '{"limit":10,"condition":{"operation":"and","sub_conditions":[
    {"field":"bom_material_code","operation":"==","value":"<产品编码>"},
    {"field":"alt_group_no","operation":"==","value":"<替代组号>"}
  ]}}'

# 查物料在途 PO
kweaver bkn object-type query supply-dup-cx po \
  '{"limit":20,"condition":{"field":"material_number","operation":"==","value":"<物料编码>"}}'
```

## Rule 1 — Multi-level BOM expansion

```
recursive_expand(parent_code, accumulated_qty=1):
  Query bom where parent_material_code == parent_code
  for each row:
    eff_qty = accumulated_qty × child_quantity   // 注: BKN bom OT 暂无 child_quantity 字段
                                                 // 需从 MySQL 产品bom信息.child_quantity 获取
    if material_type == 采购件:                   // 通过 bom_to_material → material.material_type 判断
      emit leaf(material_code, eff_qty)
    else:
      recursive_expand(material_code, eff_qty)
```

**替代料处理:**

```
同一 alt_group_no 内:
  alt_priority == 0 → 主料 (默认使用)
  alt_priority > 0  → 替代料 (主料不足时按 priority 升序使用)
不同 alt_group_no → 独立物料位, 不互相替代
```

**Cycle detection:** if child appears in ancestor chain → stop and report data error.

## Rule 2 — Available quantity per material (含替代料与在途)

```
可用量(M) = inventory.available_inventory_qty (sum across warehouses)
          + sum(inventory.available_inventory_qty for 同组替代料 where alt_priority > 0)
          + sum(po.剩余量 for open POs where po.material_number == M)
```

Join keys:
- `bom.material_code` → `inventory.material_code` (库存)
- `bom.material_code` → `po.material_number` (在途)
- 替代料: same `bom.alt_group_no` + same `bom.bom_material_code`

## Rule 3 — Maximum build quantity (最大可生产量)

```
可供台数(M) = floor( 可用量(M) / eff_qty(M) )
最大可生产量 = min over all leaf M ( 可供台数(M) )
瓶颈物料 = argmin( 可供台数(M) )
```

If any leaf has zero supply → max build **0**, explain which material.

## Rule 4 — Minimum replenishment for target output (最小补货)

Given target **N** finished units:

```
for each leaf M:
  需求 = N × eff_qty(M)
  缺口 = max(0, 需求 − 可用量(M))
```

Output per M: `material_code`, `material_name`, `缺口`. Optional: 金额 if MySQL `物料信息.unit_price` available.

## Rule 5 — Daily production report aggregation (生产计划日报)

### A — 总体概况

```
product.material_name, forecast.billno
BOM行数 = count(bom rows for this product)
层级数 = max depth from recursive_expand
自制件MRP状态 = mrp_plan_order.dropstatus_title for 自制件 (materialattr_title 含"自制")
齐套率 = pmc-shortage-analysis Rule 3
风险物料 = pmc-delivery-risk Rule 4 → TOP-3
```

### B — 高优先级行动项

```
Query pr where srcbillid in (MRP单号 list for this FCST)
Check: pr.pr_id → po.srcbillid match?
  无匹配 → 未转PO → 列入行动项 (物料 + 原因 + 建议)
```

### C — 未来 14 天到货预测

```
Query po where material_number in (缺料物料 list)
  and deliverdate between today and today+14
Group by deliverdate → daily arrival sum
Flag: which arrivals clear a known shortage
```

### D — Feishu Markdown

Compact Chinese section suitable for Bot push.

## Rule 6 — Mandatory provenance (数据来源标注)

Every figure must carry:

1. **KN**: supply-dup-cx
2. **OT + instance key**: e.g. `forecast.billno=FCST-001`, `po.billno=PO-2026-001`
3. **Query time**: when data was fetched

**Forbidden:** inventing quantities or dates (PRD §7.2).

## Reasoning chain (default)

1. Query `product` → get `material_number`
2. Query `bom` → Rule 1 recursive expand
3. For each leaf → Rule 2 via `inventory` + `po`
4. Rule 3 max build + bottleneck
5. If user gives N → Rule 4 gaps
6. For 日报 → Rule 5 (calls shortage + delivery skills) + Rule 6

## Relation to other skills

- **齐套率 / 缺料** → **pmc-shortage-analysis** (via `mrp_plan_order` + `inventory`)
- **风险分级 / 交期** → **pmc-delivery-risk** (via `po` + `sales_order`)
