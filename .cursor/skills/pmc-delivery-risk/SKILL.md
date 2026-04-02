---
name: pmc-delivery-risk
description: >-
  Encodes PMC delivery and risk reasoning: critical-path earliest finish,
  promise-date gap, bottleneck materials, risk tiers, stocking cycle split,
  monthly at-risk scan, delay sensitivity (P2). Use when the user asks about
  交期, 承诺交期, 卡点, 风险物料, 备货周期, 本月交付问题, or delivery risk (PRD F3).
---

# PMC Delivery & Risk Reasoning

Executable rules for **F3** scenarios. Combine with **pmc-shortage-analysis** for shortage inputs.

## Knowledge Network Binding

KN: **supply-dup-cx** (供应链计划协同知识网络-副本)

Reasoning chain traverses this path:

```
sales_order ──[sales_order_to_product]──▶ product ──[product_to_forecast]──▶ forecast
                                                                                │
                                                              [forecast_to_mrp] │
                                                                                ▼
                                               inventory ◀──[mrp_to_inventory]── mrp_plan_order
                                                                                │
                                                              [mrp_to_pr]       │
                                                                                ▼
                                          supplier ◀──[po_to_supplier]── po ◀──[pr_to_po]── pr
```

### Object-type field map

| Rule concept | OT | Field |
|---|---|---|
| 承诺交期 | `sales_order` | `promise_delivery_date` |
| 客户名称 | `sales_order` | `customer_name` |
| 产品编码 | `product` | `material_number` |
| 预测单号 | `forecast` | `billno` |
| 需求截止时间 | `forecast` | `enddate` |
| 需求数量 | `forecast` | `qty` |
| MRP物料编码 | `mrp_plan_order` | `materialplanid_number` |
| MRP需求量 | `mrp_plan_order` | `bizorderqty` |
| 投放状态 | `mrp_plan_order` | `dropstatus_title` |
| 物料属性 | `mrp_plan_order` | `materialattr_title` |
| PO到货日 | `po` | `deliverdate` |
| PO供应商 | `po` | `supplier_id` |
| 供应商名称 | `supplier` | `supplier_name` |
| 可用库存 | `inventory` | `available_inventory_qty` |

### Query patterns

```bash
# 查产品关联的预测单
kweaver bkn object-type query supply-dup-cx forecast \
  '{"limit":20,"condition":{"field":"material_number","operation":"==","value":"<产品编码>"}}'

# 查预测单关联的 MRP（缺料物料列表）
kweaver bkn object-type query supply-dup-cx mrp_plan_order \
  '{"limit":30,"condition":{"field":"rootdemandbillno","operation":"==","value":"<预测单号>"}}'

# 查缺料物料的 PO 到货计划
kweaver bkn object-type query supply-dup-cx po \
  '{"limit":20,"condition":{"field":"material_number","operation":"==","value":"<物料编码>"}}'

# 查承诺交期（从销售订单）
kweaver bkn object-type query supply-dup-cx sales_order \
  '{"limit":10,"condition":{"field":"product_code","operation":"==","value":"<产品编码>"}}'
```

## Reasoning chain (default)

1. 用户给出产品编码 → query `product` → 获取 `material_number`
2. 用 `product_to_forecast` 路径 → query `forecast` where `material_number` == 产品编码
3. 用 `forecast_to_mrp` 路径 → query `mrp_plan_order` where `rootdemandbillno` == forecast.billno
4. 对每颗 MRP 缺料物料 → 调用 **pmc-shortage-analysis** Rule 1 判断是否缺料
5. 对缺料物料 → query `po` where `material_number` == 物料编码 → 取 `deliverdate`
6. 计算 Rule 1-4 → 输出结论

## Rule 1 — Batch earliest finish (关键路径)

**Per short material `m`:**

```
最晚PO到货日(m) = max(po.deliverdate) where po.material_number == m
```

**Assembly (生产提前期暂无独立字段，需用户提供或参考产品信息表 assembly_time):**

```
最早完工日 = max_m(最晚PO到货日(m)) + 生产提前期
```

**Edge cases:**

- Short material has **no open PO** → mark **高风险**; do not claim numeric earliest finish.
- 生产提前期: BKN `product` OT 未含此字段; 如 MySQL `产品信息.assembly_time` 可用，以该值为准; 否则需用户提供。

## Rule 2 — Promise date check (承诺交期)

```
承诺交期 = sales_order.promise_delivery_date (where sales_order.product_code == 产品编码)

若 最早完工日 ≤ 承诺交期 → 可满足
若 最早完工日 > 承诺交期 → 不可满足
缺口天数 = 最早完工日 − 承诺交期
```

## Rule 3 — Delivery bottleneck identification (交付卡点)

Among **short** materials, flag **bottleneck** if **any** holds:

| Condition | BKN check |
|-----------|-----------|
| a) PO到货最晚 | `po.deliverdate == max(all short materials)` → 关键路径物料 |
| b) 长周期且缺料 | 采购周期 > 30天 (参考 MySQL `物料信息.delivery_duration`) and short |
| c) 无PO且无替代料 | query `po` for material returns empty, and `bom.alt_group_no` shows no alternate |

Output: `materialplanid_number` + reason(a/b/c) + `po.deliverdate`.

## Rule 4 — Risk material tiers (风险分级)

| Tier | Condition (via BKN query) |
|------|--------------------------|
| **高** | No PO for material **or** `po.deliverdate - forecast.enddate > 14` days **or** no substitute in `bom` |
| **中** | PO exists but `po.deliverdate - forecast.enddate > 7` days |
| **低** | PO exists, `po.deliverdate - forecast.enddate ≤ 7` days |

## Rule 5 — Stocking cycle split (备货周期)

```
总备货周期 = max(末端物料采购周期) + 自制件周期 + 装配周期
```

- 采购周期: MySQL `物料信息.delivery_duration` (BKN `material` OT 暂无此字段)
- 装配周期: MySQL `产品信息.assembly_time`
- 自制件: filter `mrp_plan_order.materialattr_title` 含"自制"的物料

## Rule 6 — Monthly at-risk product scan

```bash
# 查本月所有预测单
kweaver bkn object-type query supply-dup-cx forecast \
  '{"limit":30,"condition":{"field":"enddate","operation":"like","value":"2026-04%"}}'
```

For each FCST → compute 最早完工日 (Rule 1) vs `forecast.enddate`. If late → 问题产品.

## Rule 7 — Delay sensitivity (P2)

If material M slips D days: if M is on critical path (its `po.deliverdate` == max) → 交期延后 D days.

## Output discipline

- State **date basis** (calendar days).
- Cite `forecast.billno`, `po.billno`, `sales_order.order_no`.
- Missing data → PRD §8.3 — no fabricated PO or inventory.
