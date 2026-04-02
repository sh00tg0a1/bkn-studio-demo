# BKN Studio

基于 KWeaver BKN 知识网络的通用智能工作台：接入任意 BKN、安装领域 Skill，用自然语言对话查询知识网络，并生成分析报告与可视化 Artifact。

**框架与示例**：本仓库是领域无关框架；`ref/supply-dup-cx/` 与 `.cursor/skills/pmc-*` 仅为 PMC 供应链演示实例。

## 技术栈

| 层级 | 选型 |
|------|------|
| 应用框架 | Next.js 15（App Router） |
| 语言 | TypeScript 5（strict） |
| Agent | Vercel AI SDK（`ai` + `@ai-sdk/anthropic`） |
| UI | React 19、Tailwind CSS 4、shadcn/ui |
| KWeaver | `@kweaver-ai/kweaver-sdk`（CLI） |
| 包管理 | pnpm |

## 快速开始

```bash
pnpm install
cp .env.local.example .env.local
# 编辑 .env.local：LLM 密钥必填；KWeaver 可用 ~/.kweaver/ 或在此配置 KWEAVER_BASE_URL、KWEAVER_TOKEN（勿提交密钥）
pnpm dev
```

本地开发默认打开 Next 开发服务器（一般为 `http://localhost:3000`）。

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 开发模式 |
| `pnpm build` / `pnpm start` | 生产构建与启动 |
| `pnpm lint` | ESLint |
| `pnpm tsc --noEmit` | 类型检查 |
| `pnpm test` | Vitest 单测 |
| `pnpm test:e2e` | Playwright E2E |

## 文档与协作

开发与 Agent 协作约定见 **[AGENTS.md](./AGENTS.md)**。系统结构、设计文档与产品规格索引见 **[ARCHITECTURE.md](./ARCHITECTURE.md)** 与 `docs/` 目录。

## 凭据与安全

- KWeaver 凭据放在 `~/.kweaver/` 或本地 `.env.local`（已 gitignore），**不要**把 token 写入仓库或日志。
- 详见 [docs/SECURITY.md](./docs/SECURITY.md)。
