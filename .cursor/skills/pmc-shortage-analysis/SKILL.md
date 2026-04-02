---
name: pmc-shortage-analysis
description: >-
  Encodes PMC shortage and MRP analysis logic: shortage quantity, kitting rate,
  PO vs MRP date gap, MRP run status, severity ranking, PR/PO conversion.
  Use when the user asks about 缺料, 齐套率, MRP 分析, PO 交期 vs 需求日,
  PR 转 PO, MRP 是否已运算, or similar MRP shortage scenarios (PMC 智能问答 PRD F2).
---

# PMC Shortage & MRP Analysis

Executable rules for **F2** scenarios. All **numeric** outputs must match source systems; do not invent quantities.

## Knowledge Network Binding

KN: **supply-dup-cx** (供应链计划协同知识网络-副本)

Rules consume these object types and relations:

```
forecast ──[forecast_to_mrp]──▶ mrp_plan_order ──[mrp_to_inventory]──▶ inventory
                                       │
                                       ├──[mrp_to_pr]──▶ pr ──[pr_to_po]──▶ po
                                       │
                                       └─ materialplanid_number → material_code
```

### Object-type field map

| Rule concept | OT | Field | Display |
|---|---|---|---|
| 预测单号 | `forecast` | `billno` | 预测单号 |
| 产品编码 | `forecast` | `material_number` | 产品编码 |
| 需求截止时间 | `forecast` | `enddate` | 需求截止时间 |
| 需求数量 | `forecast` | `qty` | 需求数量 |
| MRP单号 | `mrp_plan_order` | `billno` | MRP单号 |
| 根需求单号 | `mrp_plan_order` | `rootdemandbillno` | 根需求单号 |
| MRP物料编码 | `mrp_plan_order` | `materialplanid_number` | 物料编码 |
| MRP需求量 | `mrp_plan_order` | `bizorderqty` | 业务修正需求量 |
| 建议订单量 | `mrp_plan_order` | `adviseorderqty` | 建议订单量 |
| 投放状态 | `mrp_plan_order` | `dropstatus_title` | 投放状态 |
| 关闭状态 | `mrp_plan_order` | `closestatus_title` | 关闭状态 |
| 可用库存 | `inventory` | `available_inventory_qty` | 可用库存数量 |
| 库存数量 | `inventory` | `inventory_qty` | 库存数量 |
| PO到货日 | `po` | `deliverdate` | 计划到货日期 |
| PO物料编码 | `po` | `material_number` | 物料编码 |
| PR单号 | `pr` | `billno` | PR单号 |
| PR来源单据 | `pr` | `srcbillid` | 来源单据号 |
| PR申请数量 | `pr` | `qty` | 申请数量 |

### Query patterns (kweaver CLI)

```bash
# 查 FCST 对应的 MRP 行
kweaver bkn object-type query supply-dup-cx mrp_plan_order \
  '{"limit":30,"condition":{"field":"rootdemandbillno","operation":"==","value":"<FCST单号>"}}'

# 查物料可用库存
kweaver bkn object-type query supply-dup-cx inventory \
  '{"limit":20,"condition":{"field":"material_code","operation":"==","value":"<物料编码>"}}'

# 查物料 PO 到货计划
kweaver bkn object-type query supply-dup-cx po \
  '{"limit":20,"condition":{"field":"material_number","operation":"==","value":"<物料编码>"}}'

# 查 MRP 下推的 PR
kweaver bkn object-type query supply-dup-cx pr \
  '{"limit":30,"condition":{"field":"srcbillid","operation":"==","value":"<MRP单号>"}}'
```

## Preconditions

- If **no MRP result** exists for the given FCST: query `mrp_plan_order` with `rootdemandbillno == FCST.billno`. Empty → respond *该需求预测单尚未完成 MRP 运算，请先在 ERP 中触发 MRP* and stop.
- **可用库存**: use `inventory.available_inventory_qty` directly (the BKN field already accounts for allocation).

## Rule 1 — Single-material shortage quantity

```
缺料量 = mrp_plan_order.bizorderqty − inventory.available_inventory_qty
```

Join key: `mrp_plan_order.materialplanid_number == inventory.material_code`

- `缺料量 > 0` → short.
- `缺料量 ≤ 0` → not short.

## Rule 2 — PO delivery vs MRP need date (交期差异)

```
交期差异(天) = po.deliverdate − forecast.enddate
```

Join: `po.material_number == mrp_plan_order.materialplanid_number`, scope by `mrp_plan_order.rootdemandbillno == forecast.billno`.

- `交期差异 > 0` → late risk.
- `交期差异 ≤ 0` → on time.

## Rule 3 — Kitting rate (齐套率)

```
齐套率 = count(物料 where inventory.available_inventory_qty ≥ mrp_plan_order.bizorderqty)
         / count(该FCST下全部MRP物料)  × 100%
```

Threshold: **齐套率 < 80%** → list 未齐套物料 with gap.

## Rule 4 — MRP release / run status

```
Query: mrp_plan_order where rootdemandbillno == <FCST.billno>
Check: dropstatus_title
  "已投放" → 已运算
  其他 / 无记录 → 未运算
```

## Rule 5 — Shortage severity ranking (TOP-N)

```
排序分 = 缺料量 (descending)
```

Default N=5. Output: `materialplanid_number` + `缺料量` + `rootdemandbillno`.

## Rule 6 — PR → PO conversion

```
Query pr where srcbillid == <MRP.billno>
For each PR, check po where srcbillid == pr.pr_id
  有匹配 → 已转PO
  无匹配 → 未转PO
转换率 = count(已转) / count(全部PR) × 100%
```

## Output discipline

- Every number: cite `forecast.billno`, `mrp_plan_order.billno`, `po.billno`, `inventory.material_code`.
- On **data conflict**: ERP wins; state *数据存在差异，以 ERP 数据为准*.
- Do **not** fabricate inventory or PO dates.

## Relation to other skills

- **pmc-delivery-risk** consumes short list + PO gaps from this skill.
- **pmc-producibility** reuses 可用量 and shortage context.
