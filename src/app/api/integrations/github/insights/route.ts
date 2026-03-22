import { NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";

export async function GET(): Promise<NextResponse> {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503 }
      );
    }

    const userId = auth.userId;
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    // Fetch last 30 days of activity + insights + integration in parallel
    const [activityResult, insightsResult, integrationResult] =
      await Promise.allSettled([
        supabase
          .from("github_activity")
          .select("*")
          .eq("user_id", userId)
          .gte("created_at", thirtyDaysAgo),
        supabase
          .from("slack_insights")
          .select("*")
          .eq("user_id", userId)
          .like("category", "github:%")
          .order("generated_at", { ascending: false })
          .limit(5),
        supabase
          .from("integrations")
          .select("last_synced_at, metadata")
          .eq("user_id", userId)
          .eq("provider", "github")
          .single(),
      ]);

    const allActivity =
      activityResult.status === "fulfilled" && activityResult.value.data
        ? activityResult.value.data
        : [];

    const insightsData =
      insightsResult.status === "fulfilled" && insightsResult.value.data
        ? insightsResult.value.data
        : [];

    const integration =
      integrationResult.status === "fulfilled" && integrationResult.value.data
        ? integrationResult.value.data
        : null;

    // Recalculate metrics
    const commits = allActivity.filter((a: any) => a.event_type === "commit");
    const openPRs = allActivity.filter((a: any) => a.event_type === "pr_open");
    const mergedPRs = allActivity.filter(
      (a: any) => a.event_type === "pr_merged"
    );

    const commitsByDay: Record<string, number> = {};
    for (const commit of commits) {
      const day = (commit.created_at || "").split("T")[0];
      if (day) commitsByDay[day] = (commitsByDay[day] || 0) + 1;
    }

    const commitsByAuthor: Record<string, number> = {};
    for (const commit of commits) {
      commitsByAuthor[commit.author_name] =
        (commitsByAuthor[commit.author_name] || 0) + 1;
    }

    const totalCommits = commits.length;
    const topAuthorCommits =
      Object.values(commitsByAuthor).length > 0
        ? Math.max(...(Object.values(commitsByAuthor) as number[]))
        : 0;
    const busFactor =
      totalCommits > 0
        ? Math.round((topAuthorCommits / totalCommits) * 100)
        : 0;

    const avgPROpenHours =
      mergedPRs.length > 0
        ? Math.round(
            mergedPRs.reduce(
              (sum: number, pr: any) => sum + (pr.pr_open_hours || 0),
              0
            ) / mergedPRs.length
          )
        : 0;

    const stalePRs = openPRs.filter((pr: any) => (pr.pr_open_hours || 0) > 72);

    const sortedCommits = [...commits].sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const lastCommitDate = sortedCommits[0]?.created_at || null;

    const daysSinceLastCommit = lastCommitDate
      ? Math.round(
          (Date.now() - new Date(lastCommitDate).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 999;

    const metrics = {
      total_commits_30_days: totalCommits,
      commits_by_day: commitsByDay,
      commits_by_author: commitsByAuthor,
      bus_factor_percent: busFactor,
      open_prs: openPRs.length,
      stale_prs: stalePRs.length,
      stale_pr_titles: stalePRs.slice(0, 3).map((pr: any) => pr.pr_title || ""),
      avg_pr_merge_hours: avgPROpenHours,
      days_since_last_commit: daysSinceLastCommit,
      repos_analyzed: integration?.metadata?.repo_names?.slice(0, 5) || [],
    };

    return NextResponse.json({
      connected: !!integration,
      last_synced: integration?.last_synced_at || null,
      metrics,
      insights: insightsData,
    });
  } catch (error: any) {
    console.error("GitHub insights error:", error.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
