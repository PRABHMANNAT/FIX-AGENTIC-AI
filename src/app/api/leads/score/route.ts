import { NextRequest, NextResponse } from "next/server";
import { scoreBatchWithOpenAI } from "@/lib/openai";
import { createAdminClient, getAuthenticatedUserContext } from "@/lib/supabase";
import type { LeadSource } from "@/types";

interface ScoreRequestBody {
  user_id?: string;
  icp_description?: string;
  lead_ids?: string[];
  icp_id?: string;
}

interface RescoreLeadRow {
  id: string;
  source: LeadSource;
  raw_data: Record<string, unknown> | null;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as ScoreRequestBody;
  const auth = await getAuthenticatedUserContext(body.user_id);

  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!body.icp_description) {
    return NextResponse.json(
      { error: "Describe your ideal customer before rescoring this list." },
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

  let query = supabase
    .from("leads")
    .select("*")
    .eq("user_id", auth.userId)
    .not("raw_data", "is", null);

  if (body.icp_id) {
    query = query.eq("icp_id", body.icp_id);
  }

  if (body.lead_ids?.length) {
    query = query.in("id", body.lead_ids);
  }

  const { data: leads, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "We couldn't rescore those customers right now. Try again." },
      { status: 500 },
    );
  }

  const typedLeads = (leads ?? []) as RescoreLeadRow[];

  const groupedBySource = typedLeads.reduce<Record<LeadSource, RescoreLeadRow[]>>(
    (accumulator, lead) => {
      accumulator[lead.source] = [...(accumulator[lead.source] ?? []), lead];
      return accumulator;
    },
    {
      linkedin: [],
      github: [],
      manual: [],
    },
  );

  const updatedLeads: Record<string, unknown>[] = [];

  for (const source of ["linkedin", "github"] as const) {
    const sourceLeads = groupedBySource[source] ?? [];

    if (!sourceLeads.length) {
      continue;
    }

    const rawProfiles = sourceLeads.map((lead) => lead.raw_data);
    const scoredLeads = await scoreBatchWithOpenAI(rawProfiles, body.icp_description, source);

    for (const scoredLead of scoredLeads) {
      const targetLead = sourceLeads[scoredLead.profile_index];

      if (!targetLead) {
        continue;
      }

      const { data: updatedLead, error: updateError } = await supabase
        .from("leads")
        .update({
          name: scoredLead.name,
          company: scoredLead.company,
          role: scoredLead.role,
          email: scoredLead.email,
          icp_score: scoredLead.icp_score,
          intent_score: scoredLead.intent_score,
          signals: scoredLead.signals,
          score_reason: scoredLead.score_reason,
        })
        .eq("id", targetLead.id)
        .eq("user_id", auth.userId)
        .select("*")
        .single();

      if (!updateError && updatedLead) {
        updatedLeads.push(updatedLead);
      }
    }
  }

  return NextResponse.json({
    rescored: updatedLeads.length,
    leads: updatedLeads,
  });
}
