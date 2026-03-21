import { NextRequest, NextResponse } from "next/server";
import { finalizeBMOProfile } from "@/lib/openai";
import { createAdminClient, getAuthenticatedUserContext } from "@/lib/supabase";
import type { BMOProfile, OnboardChatMessage, OnboardMode } from "@/types";

async function ensureProfileRow(
  supabase: NonNullable<ReturnType<typeof createAdminClient>>,
  userId: string,
) {
  const { data: existingProfile, error: profileLookupError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (profileLookupError) {
    throw new Error("Something went wrong saving your data. Try again.");
  }

  if (existingProfile) {
    return;
  }

  const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId);

  if (authError || !authData.user?.email) {
    throw new Error("You'll need to sign in again.");
  }

  const fullName =
    typeof authData.user.user_metadata?.full_name === "string" &&
    authData.user.user_metadata.full_name.trim().length > 0
      ? authData.user.user_metadata.full_name.trim()
      : authData.user.email.split("@")[0];

  const { error: insertProfileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email: authData.user.email,
      full_name: fullName,
    },
    { onConflict: "id" },
  );

  if (insertProfileError) {
    throw new Error("Something went wrong saving your data. Try again.");
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    profile?: Partial<BMOProfile> | null;
    conversation?: OnboardChatMessage[];
    user_id?: string;
    mode?: OnboardMode;
  };

  const auth = await getAuthenticatedUserContext(body.user_id);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const conversation =
    Array.isArray(body.conversation) &&
    body.conversation.every((message) => typeof message?.content === "string")
      ? body.conversation
      : [];

  if (!conversation.length && !body.profile) {
    return NextResponse.json(
      { error: "Tell me a bit more before I build your office." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Something went wrong saving your data. Try again." },
      { status: 500 },
    );
  }

  try {
    await ensureProfileRow(supabase, auth.userId);

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("bmo_config")
      .eq("id", auth.userId)
      .maybeSingle();

    const finalizedProfile = await finalizeBMOProfile({
      profile: body.profile,
      conversation,
      mode: body.mode,
    });

    const profileToSave =
      body.mode === "enhance" && existingProfile?.bmo_config
        ? ({
            ...(existingProfile.bmo_config as BMOProfile),
            ...finalizedProfile,
            synthesis_lines: finalizedProfile.synthesis_lines,
          } satisfies BMOProfile)
        : finalizedProfile;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        company_name: profileToSave.business_name,
        bmo_config: profileToSave,
        onboarded: true,
      })
      .eq("id", auth.userId);

    if (profileError) {
      console.error("Profile update failed:", profileError);
    }

    const latestIcpResult =
      body.mode === "enhance"
        ? await supabase
            .from("icp_profiles")
            .select("id")
            .eq("user_id", auth.userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : { data: null, error: null };

    let icpId: string | null = latestIcpResult.data?.id ?? null;

    if (latestIcpResult.data?.id) {
      const { error: icpUpdateError } = await supabase
        .from("icp_profiles")
        .update({
          name: `${profileToSave.business_name} Customers`,
          description: profileToSave.icp_description,
          geography: profileToSave.geography,
          linkedin_query: profileToSave.linkedin_search_query,
          github_query: profileToSave.github_search_query ?? null,
          suggested_email_hook: profileToSave.suggested_email_hook,
          is_active: true,
        })
        .eq("id", latestIcpResult.data.id)
        .eq("user_id", auth.userId)
        .select("id")
        .single();

      if (icpUpdateError) {
        console.error("ICP update failed:", icpUpdateError);
      }
    } else {
      const { data: icp, error: icpError } = await supabase
        .from("icp_profiles")
        .insert({
          user_id: auth.userId,
          name: `${profileToSave.business_name} Customers`,
          description: profileToSave.icp_description,
          geography: profileToSave.geography,
          linkedin_query: profileToSave.linkedin_search_query,
          github_query: profileToSave.github_search_query ?? null,
          suggested_email_hook: profileToSave.suggested_email_hook,
          is_active: true,
        })
        .select("id")
        .single();

      if (icpError) {
        console.error("ICP insert failed:", icpError);
      } else {
        icpId = icp.id;
      }
    }

    const response = NextResponse.json({
      success: true,
      profile: profileToSave,
      icp_id: icpId,
    });

    response.cookies.set("ao_onboarded", "1", {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    console.error("Onboarding build failed", error);

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
