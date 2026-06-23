/* eslint-disable @typescript-eslint/no-explicit-any */
import Groq from "groq-sdk";
import { SYSTEM_PROMPT } from "@/lib/chat/system-prompt";
import { TOOL_DEFS, runTool, type ToolContext } from "@/lib/chat/tools";

type ChatMessage = { role: "user" | "assistant"; content: string };

// Groq's recommended model for reliable tool/function calling (their tool-use
// docs use this one). Override with GROQ_MODEL if needed.
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const MAX_TOOL_ROUNDS = 5;
const FALLBACK_EMAIL = "info@seahorseaquariumsupply.com";

// Per Groq's tool-use guidance: a malformed tool call comes back as HTTP 400
// (tool_use_failed). Retrying with a slightly higher temperature almost always
// produces a valid call on the next attempt.
async function createWithRetry(
  groq: Groq,
  params: any,
  maxRetries = 3
): Promise<any> {
  let temperature = 0.2;
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await groq.chat.completions.create({ ...params, temperature });
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number })?.status;
      if (status === 400 && attempt < maxRetries - 1) {
        temperature = Math.min(temperature + 0.2, 1.0);
        console.log(`[api/chat] tool_use retry at temperature ${temperature}`);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export async function POST(req: Request) {
  console.log("[api/chat] start");
  try {
    const { messages, customerToken } = (await req.json()) as {
      messages: ChatMessage[];
      customerToken?: string | null;
    };

    if (!process.env.GROQ_API_KEY) {
      console.log("[api/chat] end (no key configured)");
      return Response.json({
        reply: `Our chat assistant isn't switched on yet. Please email ${FALLBACK_EMAIL} and we'll help you right away.`,
      });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const ctx: ToolContext = { customerToken };

    // Keep the system prompt first; cap history so the prompt stays small.
    const convo: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(messages || [])
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content })),
    ];

    let reply = "";
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const completion = await createWithRetry(groq, {
        model: MODEL,
        messages: convo,
        tools: TOOL_DEFS as any,
        tool_choice: "auto",
        max_tokens: 700,
      });

      const choice = completion.choices[0]?.message;
      if (!choice) break;
      convo.push(choice);

      if (choice.tool_calls && choice.tool_calls.length > 0) {
        for (const call of choice.tool_calls) {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(call.function.arguments || "{}");
          } catch {
            args = {};
          }
          const result = await runTool(call.function.name, args, ctx);
          convo.push({
            role: "tool",
            tool_call_id: call.id,
            name: call.function.name,
            content: result,
          });
        }
        continue;
      }

      reply = choice.content || "";
      break;
    }

    console.log("[api/chat] end");
    return Response.json({
      reply:
        reply ||
        `Sorry, I couldn't work that out. Please email ${FALLBACK_EMAIL} and our team will help.`,
    });
  } catch (err) {
    console.error("[api/chat] error", err);
    return Response.json({
      reply: `Something went wrong on our end. Please email ${FALLBACK_EMAIL} and we'll help you out.`,
    });
  }
}
