import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // 1. Check cron secret for security
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret && cronSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // If CRON_SECRET is not set in env: allow the request (dev mode)

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    // 2. Fetch all distinct user_ids who have a finance_settings row
    const { data: users } = await supabase
      .from("finance_settings")
      .select("user_id");

    if (!users || users.length === 0) {
      return NextResponse.json({ scanned: 0 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // 3. For each user call the proactive route
    const results = await Promise.allSettled(
      users.map(({ user_id }: { user_id: string }) =>
        fetch(`${appUrl}/api/finance/proactive`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user_id }),
        })
      )
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(
      `Proactive scan complete: ${succeeded} succeeded, ${failed} failed out of ${users.length} users`
    );

    // 4. Weekly hub analysis — run for users with stale snapshots (older than 7 days)
    for (const { user_id } of users) {
      try {
        const { data: lastSnapshot } = await supabase
          .from("intelligence_hub_snapshots")
          .select("generated_at")
          .eq("user_id", user_id)
          .order("generated_at", { ascending: false })
          .limit(1)
          .single();

        const isStale =
          !lastSnapshot ||
          new Date(lastSnapshot.generated_at) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        if (isStale) {
          fetch(`${appUrl}/api/intelligence/hub`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user_id }),
          }).catch((e) => console.error("Weekly hub analysis failed:", e));
        }
      } catch (e) {
        console.error("Hub staleness check failed for user:", user_id, e);
      }
    }

    // 5. GitHub sync — run for users whose last sync is older than 6 hours
    for (const { user_id } of users) {
      try {
        const { data: githubIntegration } = await supabase
          .from("integrations")
          .select("last_synced_at")
          .eq("user_id", user_id)
          .eq("provider", "github")
          .single();

        if (!githubIntegration) continue;

        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
        const isStale =
          !githubIntegration.last_synced_at ||
          new Date(githubIntegration.last_synced_at) < sixHoursAgo;

        if (isStale) {
          fetch(`${appUrl}/api/integrations/github/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user_id }),
          }).catch((e) => console.error("GitHub cron sync failed:", e));
        }
      } catch (e) {
        console.error("GitHub cron check failed for user:", user_id, e);
      }
    }

    // 6. Return
    return NextResponse.json({
      scanned: users.length,
      succeeded,
      failed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Proactive scan cron error:", error.message);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
