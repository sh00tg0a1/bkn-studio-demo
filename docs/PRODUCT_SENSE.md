# Product Sense

## Framework positioning

BKN Studio is a **domain-agnostic framework**. Users bring their own BKN knowledge networks and install domain-specific skills. The framework provides the workspace, chat, skill loading, and artifact infrastructure.

## Who we serve

- **领域业务用户** — 通过自然语言向知识网络提问，获得实时分析和报告。不需要了解底层数据结构。
- **业务领导 / 决策者** — 获得即时生成的结构化报告和可视化 artifact，用于会议和决策。
- **知识网络管理员 / 开发者** — 配置 BKN 绑定、编写和安装领域 Skill、上传参考资料。

## Example domain: PMC 供应链 (demo)

The repo includes PMC skills as a **reference implementation** showing how the framework serves a specific domain:

| Skill | Scenario | Example question |
|-------|----------|-----------------|
| `pmc-shortage-analysis` | 缺料、齐套率、MRP | "FCST-001 缺什么料？" |
| `pmc-delivery-risk` | 交期、卡点、风险 | "能按时交货吗？" |
| `pmc-producibility` | 可生产量、补货、日报 | "最多能产多少台？" |

Other possible domains: IT 运维、客户服务、法务合规、研发项目管理 — any domain with a BKN knowledge network.

## What "good" looks like

- User connects any BKN, installs relevant skills, and starts getting answers immediately.
- Streaming responses within seconds, backed by real knowledge network data.
- Every number in the response cites its data source (KN + object type + instance key).
- Generated artifacts (HTML reports, charts) are downloadable and presentable.
- Switching workspaces takes < 1 second, context is fully isolated.
- Installing a new skill = dropping a `SKILL.md` folder into the workspace — no code changes required.

## Non-goals

- Not a KN builder — use KWeaver platform to create and populate knowledge networks.
- Not a general-purpose LLM chat — every interaction is grounded in BKN data.
- Not a collaborative editor — single-user per workspace; no real-time co-editing.
- Not replacing human judgment — agent provides data and analysis; humans make final decisions.
