/* eslint-disable @typescript-eslint/no-explicit-any */
import Groq from "groq-sdk";
import { SYSTEM_PROMPT } from "@/lib/chat/system-prompt";
import { TOOL_DEFS, runTool, type ToolContext } from "@/lib/chat/tools";

type ChatMessage = { role: "user" | "assistant"; content: string };

const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const MAX_TOOL_ROUNDS = 5;
const FALLBACK_EMAIL = "info@seahorseaquariumsupply.com";

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
      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: convo,
        tools: TOOL_DEFS as any,
        tool_choice: "auto",
        temperature: 0.3,
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
          convo.push({ role: "tool", tool_call_id: call.id, content: result });
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
    // TEMPORARY diagnostic: surface the real error so we can fix the root
    // cause. Reverts to the friendly message once fixed.
    const e = err as {
      status?: number;
      message?: string;
      error?: { message?: string };
    };
    const detail = e?.error?.message || e?.message || String(err);
    return Response.json({
      reply: `DEBUG (temporary): [${e?.status ?? "?"}] ${detail}`,
    });
  }
}
