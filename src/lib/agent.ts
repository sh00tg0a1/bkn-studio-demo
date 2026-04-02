import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText, tool, stepCountIs, type ModelMessage } from "ai";
import { z } from "zod";
import * as kweaver from "@/lib/kweaver";
import { buildSkillsPromptSection, loadSkillsForWorkspace } from "@/lib/skills";
import * as workspace from "@/lib/workspace";

/**
 * @ai-sdk/anthropic 请求 `{baseURL}/messages`（与官方 Anthropic 一致：…/v1/messages）。
 * MiniMax 文档里的 `https://api.minimax.io/anthropic` 需带 `/v1`，否则会打到 …/anthropic/messages 得到 nginx 404。
 */
function anthropicMessagesBaseURL(raw: string): string {
  const u = raw.trim().replace(/\/$/, "");
  if (u.endsWith("/anthropic") && !/\/v\d+$/i.test(u)) {
    return `${u}/v1`;
  }
  return u;
}

/**
 * MiniMax (Anthropic-compat) rejects tool_use.input that isn't a dict.
 * AI SDK tool-call parts use **`input`** (not `args`); history may store it as a JSON string.
 */
function normalizeAnthropicToolInput(raw: unknown): Record<string, unknown> {
  if (raw == null || raw === "") return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (
        parsed !== null &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
    return {};
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function sanitizePrompt(prompt: unknown[]): unknown[] {
  return prompt.map((msg) => {
    const m = msg as Record<string, unknown>;
    if (m.role !== "assistant" || !Array.isArray(m.content)) return msg;
    return {
      ...m,
      content: (m.content as unknown[]).map((part) => {
        const p = part as Record<string, unknown>;
        if (p.type !== "tool-call") return part;
        const raw =
          p.input !== undefined && p.input !== null ? p.input : p.args;
        const input = normalizeAnthropicToolInput(raw);
        const { args: _a, input: _i, ...rest } = p;
        void _a;
        void _i;
        return { ...rest, type: "tool-call", input };
      }),
    };
  });
}

function withSanitizedToolInputs<T extends { doStream: Function; doGenerate: Function }>(model: T): T {
  return {
    ...model,
    doStream: (options: Record<string, unknown>) =>
      (model.doStream as Function)({
        ...options,
        prompt: sanitizePrompt(options.prompt as unknown[]),
      }),
    doGenerate: (options: Record<string, unknown>) =>
      (model.doGenerate as Function)({
        ...options,
        prompt: sanitizePrompt(options.prompt as unknown[]),
      }),
  };
}

function getAnthropicModel() {
  const baseURLRaw = (
    process.env.LLM_API_BASE ??
    process.env.ANTHROPIC_BASE_URL ??
    ""
  ).trim();
  const apiKey = (
    process.env.LLM_API_KEY ??
    process.env.ANTHROPIC_API_KEY ??
    ""
  ).trim();
  const modelId = (
    process.env.LLM_MODEL ??
    process.env.ANTHROPIC_MODEL ??
    "MiniMax-M2.7"
  ).trim();
  if (!baseURLRaw) {
    throw new Error(
      "缺少 LLM_API_BASE 或 ANTHROPIC_BASE_URL（MiniMax 示例: https://api.minimax.io/anthropic 或 …/anthropic/v1）",
    );
  }
  const baseURL = anthropicMessagesBaseURL(baseURLRaw);
  const provider = createAnthropic({
    baseURL,
    apiKey,
  });
  return provider(modelId);
}

function buildSystemPrompt(
  workspaceName: string,
  bknId: string,
  skillsSection: string,
  resourceNames: string[],
): string {
  const resourceList =
    resourceNames.length > 0 ? resourceNames.join(", ") : "(无)";
  return `你是 BKN Studio 的智能助手，帮助用户通过知识网络获取信息和生成分析。

当前工作区: ${workspaceName}
绑定知识网络: ${bknId}
可用资源: ${resourceList}
${skillsSection}

规则:
- 所有数据必须来自知识网络查询，禁止编造数据
- 引用数据时标注来源 (KN + OT + 实例键)
- 生成报告或分析结果时，调用 write_artifact 保存；**大段 HTML/Markdown（约 2KB 以上）或含大量引号时**：用参数 content_base64（UTF-8 的 Base64，不要换行），勿把整段 HTML 塞进 content 以免 JSON 截断或转义错误；**超大文件**可多次调用：首次 append=false 写入第一段，后续 append=true 追加（每段可用 content_base64）
- 遇到领域问题时，参考已加载的领域知识中的推理规则（来源包括知识网络、工作区 \`skills/\`、仓库内 \`.cursor/skills/\`、本机 \`~/.agents/skills/\`；同名 skill_id 优先级：BKN → 工作区 → 项目 \`.cursor/skills\` → \`~/.agents/skills\`）
- 面向用户的回复使用标准 Markdown（标题、列表、加粗、表格、代码块）；列表用 \`- \` 或 \`1. \` 编写，少用仅依赖 emoji 的「伪列表」，以便界面正确渲染
- 保存成果后若需用户在浏览器中打开查看（如 HTML 可视化），推荐写 **Markdown 链接**：\`[在浏览器中打开](artifact:文件名.html)\`、\`[查看 kn_structure.html](artifact:kn_structure.html)\`（\`artifact:\` 前缀）或 \`[标题](文件名.html)\`（扩展名为 html/htm/md/json/txt/csv）。**正文里出现的裸文件名**（如一行 \`📄 report.html\`、句末 \`已保存为 kn_structure.html。\`）界面也会自动变为可预览的**成果卡片**；代码块与行内反引号内的文件名不会被改写。`;
}

function buildTools(workspaceName: string, bknId: string) {
  return {
    bkn_query: tool({
      description: "查询 BKN 知识网络中的对象实例，返回 JSON 文本",
      inputSchema: z.object({
        objectType: z.string().describe("对象类型名称"),
        condition: z.string().optional().describe("查询条件 JSON 字符串"),
        limit: z.number().optional().default(20).describe("返回数量上限"),
      }),
      execute: async ({ objectType, condition, limit }) => {
        try {
          return await kweaver.bknQuery(bknId, objectType, {
            condition,
            limit: limit ?? 20,
          });
        } catch (e) {
          return `查询失败: ${(e as Error).message}`;
        }
      },
    }),
    bkn_search: tool({
      description: "语义搜索知识网络内容",
      inputSchema: z.object({
        query: z.string().describe("搜索关键词"),
      }),
      execute: async ({ query }) => {
        try {
          return await kweaver.bknSearch(bknId, query);
        } catch (e) {
          return `搜索失败: ${(e as Error).message}`;
        }
      },
    }),
    bkn_schema: tool({
      description: "获取知识网络的对象类型列表",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          return await kweaver.bknSchema(bknId);
        } catch (e) {
          return `获取 Schema 失败: ${(e as Error).message}`;
        }
      },
    }),
    bkn_action: tool({
      description:
        "执行知识网络 Action（有副作用，仅在用户明确要求时调用）",
      inputSchema: z.object({
        actionName: z.string(),
        params: z.string().describe("Action 参数 JSON 字符串"),
      }),
      execute: async ({ actionName, params }) => {
        try {
          return await kweaver.bknAction(bknId, actionName, params);
        } catch (e) {
          return `Action 执行失败: ${(e as Error).message}`;
        }
      },
    }),
    read_resource: tool({
      description: "读取用户上传的资源文件内容（文本）",
      inputSchema: z.object({
        filename: z.string(),
      }),
      execute: async ({ filename }) => {
        try {
          return await workspace.readResource(workspaceName, filename);
        } catch (e) {
          return `读取资源失败: ${(e as Error).message}`;
        }
      },
    }),
    list_resources: tool({
      description: "列出当前工作区的所有资源文件名",
      inputSchema: z.object({}),
      execute: async () => {
        const files = await workspace.listResources(workspaceName);
        return JSON.stringify(files.map((f) => f.name));
      },
    }),
    write_artifact: tool({
      description:
        "保存成果文件。短文本用 content；长 HTML/MD 或含双引号较多时必须用 content_base64（UTF-8 Base64 单行）。超大文件分多次：首调 append=false，后续 append=true 追加。",
      inputSchema: z
        .object({
          filename: z.string().describe("文件名，如 report.html"),
          content: z
            .string()
            .optional()
            .describe("短文本明文；长内容勿用，改用 content_base64"),
          content_base64: z
            .string()
            .optional()
            .describe("文件内容的 Base64（UTF-8 编码后 Base64，无换行）"),
          append: z
            .boolean()
            .optional()
            .describe(
              "true=追加到已有文件；false=覆盖写入。分块时第一次 false，之后 true",
            ),
        })
        .superRefine((data, ctx) => {
          const hasPlain = data.content != null && data.content.length > 0;
          const hasB64 =
            data.content_base64 != null && data.content_base64.length > 0;
          if (!hasPlain && !hasB64) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "必须提供 content 或 content_base64 之一（非空）",
            });
          }
        }),
      execute: async (input) => {
        const append = input.append === true;
        let body: string;
        if (input.content_base64 != null && input.content_base64.length > 0) {
          const b64 = input.content_base64.replace(/\s/g, "");
          body = Buffer.from(b64, "base64").toString("utf8");
        } else {
          body = input.content ?? "";
        }
        if (append) {
          let prev = "";
          try {
            prev = (
              await workspace.readArtifact(workspaceName, input.filename)
            ).toString("utf8");
          } catch {
            /* 新文件，无历史内容 */
          }
          await workspace.writeArtifact(
            workspaceName,
            input.filename,
            prev + body,
          );
        } else {
          await workspace.writeArtifact(workspaceName, input.filename, body);
        }
        return append
          ? `已追加到成果: ${input.filename}（${body.length} 字符）`
          : `已保存成果: ${input.filename}`;
      },
    }),
    list_artifacts: tool({
      description: "列出当前工作区的所有成果文件名",
      inputSchema: z.object({}),
      execute: async () => {
        const files = await workspace.listArtifacts(workspaceName);
        return JSON.stringify(files.map((f) => f.name));
      },
    }),
  };
}

export async function runAgentChat(
  workspaceName: string,
  messages: ModelMessage[],
) {
  const config = await workspace.getWorkspace(workspaceName);
  const skills = await loadSkillsForWorkspace(workspaceName, config.bknId);
  const skillsSection = buildSkillsPromptSection(skills);
  const resources = await workspace.listResources(workspaceName);
  const resourceNames = resources.map((r) => r.name);

  return streamText({
    model: withSanitizedToolInputs(getAnthropicModel()),
    system: buildSystemPrompt(
      config.name,
      config.bknId,
      skillsSection,
      resourceNames,
    ),
    messages,
    tools: buildTools(workspaceName, config.bknId),
    stopWhen: stepCountIs(12),
    temperature: 0.3,
    maxOutputTokens: Math.min(
      65536,
      Math.max(
        4096,
        Number.parseInt(process.env.LLM_MAX_OUTPUT_TOKENS ?? "16384", 10) ||
          16384,
      ),
    ),
  });
}
