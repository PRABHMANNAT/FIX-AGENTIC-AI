import { NextRequest, NextResponse } from "next/server";
import { runOnboardChat } from "@/lib/openai";
import { getAuthenticatedUserContext } from "@/lib/supabase";
import type { BMOProfile, OnboardChatMessage, OnboardChatResponse, OnboardMode } from "@/types";

function getQuickOptions(response: OnboardChatResponse) {
  if (response.ready_to_build || response.next_topic === "done") {
    return null;
  }

  if (response.next_topic === "goal") {
    if (response.profile_update.industry?.toLowerCase().includes("gym")) {
      return ["Get more members", "Keep existing ones", "Grow revenue", "Build awareness"];
    }

    return ["Get more customers", "Keep existing ones", "Grow my revenue", "Build my brand"];
  }

  if (response.next_topic === "acquisition") {
    return ["Word of mouth", "Google / search", "Social media", "I don't have many yet"];
  }

  if (response.next_topic === "pain_point") {
    return ["Not enough new people", "People don't come back", "Hard to stand out", "No time for marketing"];
  }

  if (response.next_topic === "details") {
    if (response.profile_update.industry?.toLowerCase().includes("gym")) {
      return ["Anyone in the area", "Office workers", "Students", "Health-conscious people"];
    }

    return ["Anyone nearby", "Working professionals", "Students", "Families"];
  }

  return ["I run a gym", "I'm building an app", "I do freelance work", "I run a local business"];
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    messages?: OnboardChatMessage[];
    user_id?: string;
    mode?: OnboardMode;
    current_profile?: Partial<BMOProfile> | null;
  };

  const auth = await getAuthenticatedUserContext(body.user_id);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const messages =
    Array.isArray(body.messages) && body.messages.every((message) => typeof message?.content === "string")
      ? body.messages
      : [];

  if (!messages.length) {
    return NextResponse.json(
      { error: "Tell me a bit about your business so I can start building your office." },
      { status: 400 },
    );
  }

  try {
    const response = await runOnboardChat({
      messages,
      currentProfile: body.current_profile,
      mode: body.mode,
    });

    return NextResponse.json({
      ...response,
      options: getQuickOptions(response),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Our AI is taking a moment. Try again in a few seconds.",
      },
      { status: 500 },
    );
  }
}
