import { convertToModelMessages, type UIMessage } from "ai";
import { runAgentChat } from "@/lib/agent";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      workspaceName?: string;
      messages?: UIMessage[];
    };
    const { workspaceName, messages } = body;
    if (!workspaceName?.trim()) {
      return new Response(JSON.stringify({ error: "workspaceName required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!messages?.length) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const modelMessages = await convertToModelMessages(
      messages.map((m) => {
        const { id: _messageId, ...rest } = m;
        void _messageId;
        return rest as Omit<UIMessage, "id">;
      }),
    );
    const result = await runAgentChat(workspaceName, modelMessages);
    return result.toUIMessageStreamResponse();
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
