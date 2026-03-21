import { NextResponse } from "next/server";
import { OPENAI_MODEL, runCoworkerAgent } from "@/lib/openai";
import { DEMO_USER_ID, generateMockCoworkerReply } from "@/lib/demo-data";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { AgentMessage } from "@/types";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function buildTitle(content: string) {
  return content.trim().slice(0, 48) || "New Conversation";
}

export async function POST(request: Request) {
  const startTime = Date.now();
  const body = (await request.json()) as {
    messages?: AgentMessage[];
    conversationId?: string | null;
    systemContext?: Record<string, unknown>;
    userId?: string;
  };

  const incomingMessages = body.messages ?? [];
  const latestUserMessage = [...incomingMessages].reverse().find((message) => message.role === "user");

  if (!latestUserMessage?.content.trim()) {
    return NextResponse.json({ error: "Type a message before sending it." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  let userId = body.userId ?? DEMO_USER_ID;
  let conversationId = body.conversationId ?? crypto.randomUUID();
  let runId: string | null = null;
  let canPersist = false;

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "You'll need to sign in again." }, { status: 401 });
    }

    userId = user.id;
    canPersist = true;

    if (!body.conversationId) {
      const { data } = await supabase
        .from("conversations")
        .insert({
          user_id: userId,
          agent_type: "coworker",
          title: buildTitle(latestUserMessage.content),
        })
        .select("id")
        .single();

      if (data?.id) {
        conversationId = data.id;
      } else {
        canPersist = false;
      }
    }

    if (canPersist) {
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        user_id: userId,
        role: "user",
        content: latestUserMessage.content,
        metadata: {
          source: "chat-ui",
        },
      });

      const { data } = await supabase
        .from("agent_runs")
        .insert({
          user_id: userId,
          agent_type: "coworker",
          status: "running",
          input: {
            messages: incomingMessages,
            systemContext: body.systemContext ?? {},
          },
        })
        .select("id")
        .single();

      runId = data?.id ?? null;
    }
  }

  const encoder = new TextEncoder();
  const agentReply = await runCoworkerAgent(incomingMessages, body.systemContext);

  const readable = new ReadableStream({
    async start(controller) {
      let finalText = "";

      try {
        if (agentReply) {
          finalText = agentReply;
          const chunks = finalText.match(/.{1,64}(\s|$)|\S+/g) ?? [finalText];

          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(chunk));
            await sleep(18);
          }
        } else {
          finalText = generateMockCoworkerReply(latestUserMessage.content);
          const chunks = finalText.match(/.{1,64}(\s|$)|\S+/g) ?? [finalText];

          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(chunk));
            await sleep(22);
          }
        }

        if (canPersist && supabase) {
          await supabase.from("messages").insert({
            conversation_id: conversationId,
            user_id: userId,
            role: "assistant",
            content: finalText,
            metadata: {
              model: OPENAI_MODEL,
            },
          });

          await supabase
            .from("conversations")
            .update({
              updated_at: new Date().toISOString(),
            })
            .eq("id", conversationId);

          if (runId) {
            await supabase
              .from("agent_runs")
              .update({
                status: "completed",
                output: {
                  message: finalText,
                  summary: finalText.slice(0, 160),
                },
                duration_ms: Date.now() - startTime,
                completed_at: new Date().toISOString(),
              })
              .eq("id", runId);
          }
        }

        controller.close();
      } catch (error) {
        if (canPersist && supabase && runId) {
          await supabase
            .from("agent_runs")
            .update({
              status: "failed",
              error: error instanceof Error ? error.message : "Unknown agent error",
              duration_ms: Date.now() - startTime,
              completed_at: new Date().toISOString(),
            })
            .eq("id", runId);
        }

        controller.error(error);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "x-conversation-id": conversationId,
    },
  });
}
