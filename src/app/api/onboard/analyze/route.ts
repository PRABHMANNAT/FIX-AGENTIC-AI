import { NextRequest, NextResponse } from "next/server";
import { analyzeBusinessDescription } from "@/lib/openai";
import { getAuthenticatedUserContext } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    description?: string;
    user_id?: string;
  };

  const auth = await getAuthenticatedUserContext(body.user_id);

  if ("error" in auth) {
    return NextResponse.json({ error: "You'll need to sign in again." }, { status: auth.status });
  }

  if (!body.description || body.description.trim().length < 10) {
    return NextResponse.json(
      { error: "Tell us a bit more about your business so we can set things up properly." },
      { status: 400 },
    );
  }

  try {
    const result = await analyzeBusinessDescription(body.description.trim());
    return NextResponse.json(result);
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
