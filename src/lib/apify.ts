import type { RawGitHubProfile, RawLinkedInProfile } from "@/types";

const APIFY_BASE = "https://api.apify.com/v2";
const TOKEN = process.env.APIFY_API_TOKEN ?? "";

export interface ActorRunResult<T> {
  runId: string;
  items: T[];
}

function assertApifyConfigured() {
  if (!TOKEN) {
    throw new Error("APIFY_API_TOKEN is not configured.");
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runActor<T>(
  actorId: string,
  input: Record<string, unknown>,
  timeoutMs = 90000,
): Promise<ActorRunResult<T>> {
  assertApifyConfigured();

  const startRes = await fetch(
    `${APIFY_BASE}/acts/${encodeURIComponent(actorId)}/runs?token=${TOKEN}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  if (!startRes.ok) {
    throw new Error(`Apify start failed: ${await startRes.text()}`);
  }

  const startData = await startRes.json();
  const runId = startData?.data?.id as string | undefined;

  if (!runId) {
    throw new Error("No run ID returned from Apify.");
  }

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await sleep(4000);

    const statusRes = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${TOKEN}`);
    const statusData = await statusRes.json();
    const status = statusData?.data?.status as string | undefined;

    if (status === "SUCCEEDED") {
      const datasetId = statusData?.data?.defaultDatasetId as string | undefined;

      if (!datasetId) {
        return { runId, items: [] };
      }

      const itemsRes = await fetch(
        `${APIFY_BASE}/datasets/${datasetId}/items?token=${TOKEN}&format=json&clean=true`,
      );

      if (!itemsRes.ok) {
        throw new Error(`Apify dataset fetch failed: ${await itemsRes.text()}`);
      }

      return {
        runId,
        items: (await itemsRes.json()) as T[],
      };
    }

    if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
      throw new Error(`Apify run ${status}: run ID ${runId}`);
    }
  }

  const statusRes = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${TOKEN}`);
  const statusData = await statusRes.json();
  const datasetId = statusData?.data?.defaultDatasetId as string | undefined;

  if (!datasetId) {
    return { runId, items: [] };
  }

  const itemsRes = await fetch(
    `${APIFY_BASE}/datasets/${datasetId}/items?token=${TOKEN}&format=json&clean=true`,
  );

  if (!itemsRes.ok) {
    throw new Error(`Apify dataset fetch failed: ${await itemsRes.text()}`);
  }

  return {
    runId,
    items: (await itemsRes.json()) as T[],
  };
}

export async function scrapeLinkedIn(searchQuery: string, maxResults = 25) {
  return runActor<RawLinkedInProfile>(process.env.APIFY_LINKEDIN_ACTOR_ID ?? "", {
    query: searchQuery,
    searchQuery,
    maxResults,
    scrapeType: "Short",
    proxyConfiguration: {
      useApifyProxy: true,
      apifyProxyGroups: ["RESIDENTIAL"],
    },
  });
}

export async function scrapeGitHub(searchQuery: string, maxResults = 25) {
  return runActor<RawGitHubProfile>(process.env.APIFY_GITHUB_ACTOR_ID ?? "", {
    searchQuery,
    type: "users",
    maxResults,
  });
}

export async function cancelApifyRun(runId: string): Promise<void> {
  assertApifyConfigured();

  const response = await fetch(`${APIFY_BASE}/actor-runs/${runId}/abort?token=${TOKEN}`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Apify cancel failed: ${await response.text()}`);
  }
}

export type { RawLinkedInProfile, RawGitHubProfile } from "@/types";
