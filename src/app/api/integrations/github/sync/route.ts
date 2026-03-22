import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import Groq from "groq-sdk";

function calculateMetrics(allActivity: any[]) {
  const commits = allActivity.filter((a) => a.event_type === "commit");
  const openPRs = allActivity.filter((a) => a.event_type === "pr_open");
  const mergedPRs = allActivity.filter((a) => a.event_type === "pr_merged");

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
      ? Math.max(...Object.values(commitsByAuthor))
      : 0;
  const busFactor =
    totalCommits > 0
      ? Math.round((topAuthorCommits / totalCommits) * 100)
      : 0;

  const avgPROpenHours =
    mergedPRs.length > 0
      ? Math.round(
          mergedPRs.reduce((sum, pr) => sum + (pr.pr_open_hours || 0), 0) /
            mergedPRs.length
        )
      : 0;

  const stalePRs = openPRs.filter((pr) => (pr.pr_open_hours || 0) > 72);

  const sortedCommits = [...commits].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const lastCommitDate = sortedCommits[0]?.created_at || null;

  const daysSinceLastCommit = lastCommitDate
    ? Math.round(
        (Date.now() - new Date(lastCommitDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 999;

  return {
    total_commits_30_days: totalCommits,
    commits_by_day: commitsByDay,
    commits_by_author: commitsByAuthor,
    bus_factor_percent: busFactor,
    open_prs: openPRs.length,
    stale_prs: stalePRs.length,
    stale_pr_titles: stalePRs.slice(0, 3).map((pr) => pr.pr_title || ""),
    avg_pr_merge_hours: avgPROpenHours,
    days_since_last_commit: daysSinceLastCommit,
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { userId } = body as { userId: string };

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503 }
      );
    }

    // STEP 1 — Fetch credentials
    const { data: integration } = await supabase
      .from("integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", "github")
      .single();

    if (!integration) {
      return NextResponse.json(
        { error: "GitHub not connected" },
        { status: 400 }
      );
    }

    const accessToken = integration.access_token;
    const repoNames: string[] = integration.metadata?.repo_names || [];

    // STEP 2 — Fetch events for each repo (max 5)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const allActivity: any[] = [];

    for (const repoName of repoNames.slice(0, 5)) {
      // Commits
      try {
        const commitsRes = await fetch(
          `https://api.github.com/repos/${repoName}/commits?since=${thirtyDaysAgo.toISOString()}&per_page=50`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        );
        const commits = await commitsRes.json();
        if (Array.isArray(commits)) {
          for (const commit of commits) {
            allActivity.push({
              user_id: userId,
              repo_name: repoName,
              event_type: "commit",
              author_name: commit.commit?.author?.name || "unknown",
              pr_title: null,
              pr_open_hours: null,
              commit_count: 1,
              created_at:
                commit.commit?.author?.date || new Date().toISOString(),
            });
          }
        }
      } catch (e) {
        console.error(`Failed to fetch commits for ${repoName}:`, e);
      }

      // Pull Requests
      try {
        const prsRes = await fetch(
          `https://api.github.com/repos/${repoName}/pulls?state=all&per_page=30&sort=updated`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        );
        const prs = await prsRes.json();
        if (Array.isArray(prs)) {
          for (const pr of prs) {
            const openedAt = new Date(pr.created_at);
            const closedAt = pr.closed_at
              ? new Date(pr.closed_at)
              : new Date();
            const prOpenHours = Math.round(
              (closedAt.getTime() - openedAt.getTime()) / (1000 * 60 * 60)
            );

            allActivity.push({
              user_id: userId,
              repo_name: repoName,
              event_type: pr.state === "open" ? "pr_open" : "pr_merged",
              author_name: pr.user?.login || "unknown",
              pr_title: (pr.title || "").substring(0, 200),
              pr_open_hours: prOpenHours,
              commit_count: 0,
              created_at: pr.created_at,
            });
          }
        }
      } catch (e) {
        console.error(`Failed to fetch PRs for ${repoName}:`, e);
      }

      // Respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // STEP 3 — Save to Supabase
    if (allActivity.length > 0) {
      try {
        await supabase.from("github_activity").upsert(allActivity, {
          onConflict: "user_id,repo_name,event_type,created_at",
        });
      } catch (e) {
        console.error("Failed to upsert github_activity:", e);
      }
    }

    // STEP 4 — Calculate velocity metrics
    const metrics = {
      ...calculateMetrics(allActivity),
      repos_analyzed: repoNames.slice(0, 5),
    };

    // STEP 5 — Call Groq for engineering insights
    let insightsParsed: { insights: any[]; velocity_score: number } = {
      insights: [],
      velocity_score: 50,
    };

    try {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        max_tokens: 700,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: `You are an engineering velocity analyst for a startup.
Analyze this GitHub activity data and surface 3 to 4 genuine
engineering workflow insights with specific numbers.
Focus on: shipping pace, PR bottlenecks, bus factor risk,
commit patterns, team contribution balance.
Return ONLY valid JSON:
{
  "insights": [
    {
      "insight_text": "specific observation with real numbers",
      "category": "velocity or bottleneck or risk or health",
      "severity": "high or medium or low"
    }
  ],
  "velocity_score": 0-100 integer rating of engineering health
}`,
          },
          {
            role: "user",
            content: `Engineering metrics (last 30 days):\n${JSON.stringify(metrics, null, 2)}`,
          },
        ],
      });

      const responseText =
        completion.choices[0]?.message?.content || "{}";
      try {
        const cleaned = responseText.replace(/```json|```/g, "").trim();
        insightsParsed = JSON.parse(cleaned);
      } catch (e) {
        console.error("Failed to parse Groq GitHub insights:", e);
      }
    } catch (e) {
      console.error("Groq GitHub call failed:", e);
    }

    // STEP 6 — Save insights and update integrations
    if (
      Array.isArray(insightsParsed.insights) &&
      insightsParsed.insights.length > 0
    ) {
      try {
        await supabase.from("slack_insights").insert(
          insightsParsed.insights.map((i: any) => ({
            user_id: userId,
            insight_text: i.insight_text,
            category: `github:${i.category}`,
            severity: i.severity,
            raw_data: metrics,
            generated_at: new Date().toISOString(),
          }))
        );
      } catch (e) {
        console.error("Failed to save GitHub insights:", e);
      }

      for (const insight of insightsParsed.insights) {
        if (insight.severity !== "high") continue;
        try {
          await supabase.from("proactive_alerts").insert({
            user_id: userId,
            message: insight.insight_text,
            urgency: "high",
            category: "engineering",
            suggested_action: "Review your GitHub activity dashboard",
            status: "unread",
          });
        } catch (e) {
          console.error("Failed to insert proactive alert from GitHub:", e);
        }
      }
    }

    try {
      await supabase
        .from("integrations")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("provider", "github");
    } catch (e) {
      console.error("Failed to update GitHub last_synced_at:", e);
    }

    const commits = allActivity.filter((a) => a.event_type === "commit");
    const prs = allActivity.filter(
      (a) => a.event_type === "pr_open" || a.event_type === "pr_merged"
    );

    // STEP 7 — Return
    return NextResponse.json({
      commits_synced: commits.length,
      prs_synced: prs.length,
      metrics,
      insights: insightsParsed.insights || [],
      velocity_score: insightsParsed.velocity_score || 50,
    });
  } catch (error: any) {
    console.error("GitHub sync error:", error.message);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
