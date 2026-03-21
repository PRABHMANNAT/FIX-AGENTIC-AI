import { NextRequest, NextResponse } from "next/server";
import type { PostgrestSingleResponse, SupabaseClient } from "@supabase/supabase-js";
import { scrapeGitHub, scrapeLinkedIn } from "@/lib/apify";
import { scoreBatchWithOpenAI } from "@/lib/openai";
import { createAdminClient, getAuthenticatedUserContext } from "@/lib/supabase";
import type { BMOProfile, ICPProfile, LeadInsert, LeadSource } from "@/types";

type ScrapeSource = Exclude<LeadSource, "manual">;

interface ScrapeRequestBody {
  user_id?: string;
  icp_id?: string;
  icp_description?: string;
  search_query?: string;
  sources?: ScrapeSource[];
  count?: number;
}

function isMissingScrapeRunsTableError(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST205" ||
    error?.message?.includes("Could not find the table 'public.scrape_runs'") === true
  );
}

function toPlainEnglishError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown scrape error";

  if (message.includes("APIFY_API_TOKEN")) {
    return "Customer finding is not ready yet. Add your Apify key and try again.";
  }

  if (message.includes("OpenAI")) {
    return "Our AI is taking a moment. Try again in a few seconds.";
  }

  return "We couldn't find anyone matching that description. Try being a bit more specific about who you're looking for.";
}

function mapLeadForInsert(params: {
  userId: string;
  icpId: string | null;
  source: ScrapeSource;
  scoredLead: Awaited<ReturnType<typeof scoreBatchWithOpenAI>>[number];
  rawProfile: Record<string, unknown>;
}): LeadInsert {
  const { userId, icpId, source, scoredLead, rawProfile } = params;

  return {
    user_id: userId,
    icp_id: icpId,
    name: scoredLead.name,
    company: scoredLead.company,
    role: scoredLead.role,
    email: scoredLead.email,
    linkedin_url: source === "linkedin" ? ((rawProfile.profileUrl as string | undefined) ?? null) : null,
    github_url: source === "github" ? ((rawProfile.profileUrl as string | undefined) ?? null) : null,
    avatar_url: ((rawProfile.avatarUrl as string | undefined) ?? null) || ((rawProfile.avatar_url as string | undefined) ?? null),
    location: (rawProfile.location as string | undefined) ?? null,
    source,
    raw_data: rawProfile,
    icp_score: scoredLead.icp_score,
    intent_score: scoredLead.intent_score,
    signals: scoredLead.signals,
    score_reason: scoredLead.score_reason,
  };
}

async function createRun(
  supabase: SupabaseClient,
  userId: string,
  icpId: string | null,
  source: ScrapeSource,
) {
  const { data, error } = await supabase
    .from("scrape_runs")
    .insert({
      user_id: userId,
      icp_id: icpId,
      source,
      status: "running",
    })
    .select("id")
    .single();

  if (isMissingScrapeRunsTableError(error)) {
    console.warn("scrape_runs table is missing; continuing without scrape run audit logging.");
    return null;
  }

  if (error) {
    throw new Error(`Failed to create scrape run for ${source}: ${error.message}`);
  }

  return data.id as string;
}

async function updateRun(
  supabase: SupabaseClient,
  runId: string | null | undefined,
  payload: Record<string, unknown>,
) {
  if (!runId) {
    return;
  }

  const { error } = await supabase.from("scrape_runs").update(payload).eq("id", runId);

  if (isMissingScrapeRunsTableError(error)) {
    console.warn("scrape_runs table is missing; skipping scrape run audit updates.");
    return;
  }

  if (error) {
    throw new Error(`Failed to update scrape run ${runId}: ${error.message}`);
  }
}

async function saveLeadsForSource(
  supabase: SupabaseClient,
  source: ScrapeSource,
  leads: LeadInsert[],
) {
  if (!leads.length) {
    return [];
  }

  const onConflict = source === "linkedin" ? "linkedin_url,user_id" : "github_url,user_id";
  const { data, error } = await supabase
    .from("leads")
    .upsert(leads, {
      onConflict,
      ignoreDuplicates: false,
    })
    .select("*");

  if (!error && data) {
    return data;
  }

  const savedLeads: Record<string, unknown>[] = [];

  for (const lead of leads) {
    const singleResult = (await supabase
      .from("leads")
      .upsert(lead, {
        onConflict,
        ignoreDuplicates: false,
      })
      .select("*")
      .single()) as PostgrestSingleResponse<Record<string, unknown>>;

    if (!singleResult.error && singleResult.data) {
      savedLeads.push(singleResult.data);
    }
  }

  return savedLeads;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as ScrapeRequestBody;
  const auth = await getAuthenticatedUserContext(body.user_id);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Something went wrong saving your data. Try again." },
      { status: 500 },
    );
  }

  const [icpResult, profileResult] = await Promise.all([
    body.icp_id
      ? supabase.from("icp_profiles").select("*").eq("id", body.icp_id).eq("user_id", auth.userId).maybeSingle()
      : Promise.resolve({ data: null } as { data: ICPProfile | null }),
    supabase.from("profiles").select("bmo_config").eq("id", auth.userId).maybeSingle(),
  ]);

  const icp = icpResult.data ?? null;
  const bmoConfig = (profileResult.data?.bmo_config as BMOProfile | null | undefined) ?? null;
  const icpDescription = body.icp_description ?? icp?.description ?? bmoConfig?.icp_description ?? null;
  const searchQuery =
    body.search_query ??
    icp?.linkedin_query ??
    bmoConfig?.linkedin_search_query ??
    "startup founder Sydney";
  const githubQuery = icp?.github_query ?? bmoConfig?.github_search_query ?? null;
  const icpId = body.icp_id ?? icp?.id ?? null;

  if (!icpDescription) {
    return NextResponse.json(
      {
        error:
          "We need a short description of your ideal customer before we can start finding people.",
      },
      { status: 400 },
    );
  }

  const requestedSources = body.sources?.length ? body.sources : ["linkedin", "github"];
  const sources = requestedSources.filter(
    (source): source is ScrapeSource => source === "linkedin" || source === "github",
  );
  const enabledSources = sources.filter((source) => source !== "github" || Boolean(githubQuery));
  const count = typeof body.count === "number" && body.count > 0 ? body.count : 25;

  const runIds = Object.fromEntries(
    await Promise.all(
      enabledSources.map(async (source) => [source, await createRun(supabase, auth.userId, icpId, source)]),
    ),
  ) as Record<ScrapeSource, string | null>;

  const results = await Promise.allSettled(
    enabledSources.map(async (source) => {
      try {
        const scrapeResult =
          source === "linkedin"
            ? await scrapeLinkedIn(searchQuery, count)
            : await scrapeGitHub(githubQuery as string, count);

        const rawProfiles = scrapeResult.items;

        await updateRun(supabase, runIds[source], {
          apify_run_id: scrapeResult.runId,
          leads_found: rawProfiles.length,
        });

        if (!rawProfiles.length) {
          await updateRun(supabase, runIds[source], {
            status: "completed",
            leads_found: 0,
            leads_scored: 0,
            completed_at: new Date().toISOString(),
          });

          return {
            source,
            leads: [],
            error: "No profiles found",
          };
        }

        const scoredLeads = await scoreBatchWithOpenAI(rawProfiles, icpDescription, source);
        const mappedLeads = scoredLeads.map((scoredLead) =>
          mapLeadForInsert({
            userId: auth.userId,
            icpId,
            source,
            scoredLead,
            rawProfile: rawProfiles[scoredLead.profile_index] as unknown as Record<string, unknown>,
          }),
        );

        await updateRun(supabase, runIds[source], {
          leads_scored: scoredLeads.length,
          status: "completed",
          completed_at: new Date().toISOString(),
        });

        return {
          source,
          leads: mappedLeads,
          error: null,
        };
      } catch (error) {
        const message = toPlainEnglishError(error);

        await updateRun(supabase, runIds[source], {
          status: "failed",
          error: message,
          completed_at: new Date().toISOString(),
        });

        return {
          source,
          leads: [] as LeadInsert[],
          error: message,
        };
      }
    }),
  );

  const errors: Record<string, string> = {};
  const savedLeads: Record<string, unknown>[] = [];

  for (const result of results) {
    if (result.status !== "fulfilled") {
      continue;
    }

    if (result.value.error) {
      errors[result.value.source] = result.value.error;
    }

    const persisted = await saveLeadsForSource(supabase, result.value.source, result.value.leads);
    savedLeads.push(...persisted);
  }

  return NextResponse.json({
    leads_found: savedLeads.length,
    sources_completed: enabledSources,
    errors: Object.keys(errors).length ? errors : null,
    leads: savedLeads,
  });
}
