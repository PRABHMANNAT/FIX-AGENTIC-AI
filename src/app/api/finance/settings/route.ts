import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";

export async function GET(): Promise<NextResponse | Response> {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    const { data, error } = await supabase
      .from("finance_settings")
      .select("*")
      .eq("user_id", auth.userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Settings fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }

    return NextResponse.json(data || {});
  } catch (error) {
    console.error("Settings error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse | Response> {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { company_name, company_address, gstin, logo_url, slack_webhook_url, currency, bank_details } = body;

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    const { data, error } = await supabase
      .from("finance_settings")
      .upsert(
        {
          user_id: auth.userId,
          company_name: company_name || null,
          company_address: company_address || null,
          gstin: gstin || null,
          logo_url: logo_url || null,
          slack_webhook_url: slack_webhook_url || null,
          currency: currency || "INR",
          bank_details: bank_details || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("Settings save error:", error);
      return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
    }

    return NextResponse.json({ success: true, settings: data });
  } catch (error) {
    console.error("Settings error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
