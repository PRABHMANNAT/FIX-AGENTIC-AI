import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";
import pptxgen from "pptxgenjs";

const BUCKET = "finance-exports";
const SIGNED_URL_TTL = 3600;

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg: "F8F9FA",          // slide background — light neutral
  dark: "1E1B4B",        // heading / accent dark navy
  accent: "7C3AED",      // violet accent
  accentLight: "EDE9FE", // light violet tint
  green: "059669",
  red: "DC2626",
  gray: "6B7280",
  white: "FFFFFF",
  text: "1F2937",
  muted: "9CA3AF",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const str = (v: unknown): string =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : "";

const fmtNum = (v: unknown, prefix = ""): string =>
  typeof v === "number" ? `${prefix}${v.toLocaleString("en-IN")}` : str(v);

const bullets = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(String) : [];

/** Add the shared slide chrome: bg, accent sidebar, slide number */
function initSlide(prs: pptxgen, slideNum: number): ReturnType<pptxgen["addSlide"]> {
  const s = prs.addSlide();
  s.background = { color: T.bg };
  // Left accent bar
  s.addShape(prs.ShapeType.rect, {
    x: 0, y: 0, w: 0.09, h: "100%",
    fill: { color: T.accent },
    line: { color: T.accent },
  });
  // Slide number  (bottom-right)
  s.addText(`${slideNum}`, {
    x: 9.0, y: 5.3, w: 0.6, h: 0.25,
    fontSize: 9,
    color: T.muted,
    align: "right",
    fontFace: "Arial",
  });
  return s;
}

/** Add a standard section heading */
function addHeading(s: ReturnType<pptxgen["addSlide"]>, text: string) {
  s.addText(text, {
    x: 0.3, y: 0.14, w: 9.4, h: 0.55,
    fontSize: 20,
    bold: true,
    color: T.dark,
    fontFace: "Arial",
    valign: "middle",
  });
  // Thin rule under heading
  s.addShape("line" as Parameters<typeof s.addShape>[0], {
    x: 0.3, y: 0.72, w: 9.4, h: 0,
    line: { color: T.accent, width: 1.5 },
  });
}

/** Add a subtitle label */
function addSubtitle(s: ReturnType<pptxgen["addSlide"]>, text: string, y = 0.8) {
  s.addText(text, {
    x: 0.3, y, w: 9.4, h: 0.38,
    fontSize: 13,
    color: T.gray,
    fontFace: "Arial",
    italic: true,
  });
}

/** Bullet list paragraph */
function addBullets(
  s: ReturnType<pptxgen["addSlide"]>,
  items: string[],
  opts: { x?: number; y?: number; w?: number; h?: number; color?: string },
) {
  if (!items.length) return;
  const { x = 0.3, y = 1.3, w = 9.2, h = 3.8, color = T.text } = opts;
  s.addText(
    items.map((item) => ({ text: item, options: { bullet: { type: "bullet" }, breakLine: true } })),
    { x, y, w, h, fontSize: 12, color, fontFace: "Arial", valign: "top", paraSpaceAfter: 4 },
  );
}

/** Metric box helper */
function addMetricBox(
  s: ReturnType<pptxgen["addSlide"]>,
  label: string,
  value: string,
  x: number,
  y: number,
  w = 3.0,
  h = 1.05,
  accent = T.accent,
) {
  s.addShape(prs.ShapeType.rect, { x, y, w, h, fill: { color: T.white }, line: { color: "E5E7EB", width: 1 } });
  s.addText(label.toUpperCase(), {
    x: x + 0.1, y: y + 0.08, w: w - 0.2, h: 0.24,
    fontSize: 8, bold: true, color: T.muted, fontFace: "Arial",
    charSpacing: 2,
  });
  s.addText(value, {
    x: x + 0.1, y: y + 0.34, w: w - 0.2, h: 0.52,
    fontSize: 20, bold: true, color: accent, fontFace: "Arial",
  });
}

// ─── Route ────────────────────────────────────────────────────────────────────

// We need `prs` accessible in helpers, so declare it here
let prs: pptxgen;

export async function POST(req: NextRequest): Promise<NextResponse | Response> {
  try {
const auth = await getAuthenticatedUserContext();
if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
const body = (await req.json()) as { documentId?: string; userId?: string };
const { documentId } = body;
if (!documentId) {
    return NextResponse.json({ error: "documentId is required." }, { status: 400 });
  }
const supabase = createAdminClient();
if (!supabase) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }
const { data: doc, error: fetchErr } = await supabase
    .from("finance_documents")
    .select("*")
    .eq("id", documentId)
    .eq("user_id", auth.userId)
    .single();
if (fetchErr || !doc) {
    return NextResponse.json({ error: "Document not found or access denied." }, { status: 404 });
  }
const content = (doc.content_json ?? {}) as Record<string, unknown>;
const report = ((content.report ?? content) as Record<string, unknown>);
const slides = (content.slides ?? {}) as Record<string, unknown>;
const period = content.period as { month?: string; year?: number } | undefined;
const companyName = str(
    (slides.title as Record<string, unknown> | undefined)?.company ??
    report.company_name ??
    "Company",
  );
prs = new pptxgen();
prs.layout = "LAYOUT_WIDE";
prs.title = String(doc.title ?? "Pitch Deck");
prs.author = "AssembleOne Finance Agent";
prs.theme = { headFontFace: "Arial", bodyFontFace: "Arial" };
{
    const s = prs.addSlide();
    s.background = { color: T.dark };
    s.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: 0.09, h: "100%", fill: { color: T.accent }, line: { color: T.accent } });

    s.addText(companyName, {
      x: 0.3, y: 1.6, w: 9.4, h: 1.2,
      fontSize: 44, bold: true, color: T.white, fontFace: "Arial",
      align: "center",
    });

    const tagline = str(
      (slides.title as Record<string, unknown> | undefined)?.tagline ?? "",
    );
    if (tagline) {
      s.addText(tagline, {
        x: 0.3, y: 2.95, w: 9.4, h: 0.55,
        fontSize: 16, color: T.muted, fontFace: "Arial", align: "center", italic: true,
      });
    }

    s.addText(`Investor Update  ·  ${period?.month ?? ""} ${period?.year ?? ""}`, {
      x: 0.3, y: 5.0, w: 9.4, h: 0.35,
      fontSize: 11, color: T.muted, fontFace: "Arial", align: "center",
    });
    s.addText("CONFIDENTIAL", {
      x: 3.67, y: 5.4, w: 6, h: 0.28,
      fontSize: 9, color: T.muted, fontFace: "Arial", align: "center",
      charSpacing: 4,
    });
  }
{
    const s = initSlide(prs, 2);
    addHeading(s, "The Problem");
    const problem = (slides.problem as Record<string, unknown> | undefined) ?? {};
    addSubtitle(s, str(problem.headline ?? problem.market_pain ?? ""));
    addBullets(s, bullets(problem.points ?? problem.market_pain), { color: T.text });
  }
{
    const s = initSlide(prs, 3);
    addHeading(s, "Our Solution");
    const solution = (slides.solution as Record<string, unknown> | undefined) ?? {};
    addSubtitle(s, str(solution.headline ?? ""));
    if (solution.description) {
      s.addText(str(solution.description), {
        x: 0.3, y: 1.25, w: 9.2, h: 0.85,
        fontSize: 13, color: T.text, fontFace: "Arial", wrap: true,
      });
    }
    addBullets(s, bullets(solution.differentiators), { y: 2.15, color: T.green });
  }
{
    const s = initSlide(prs, 4);
    addHeading(s, "Traction");
    const traction = (slides.traction as Record<string, unknown> | undefined) ?? {};

    // KPI boxes — last 6 months MRR or whatever metrics we have
    const mrrHistory = bullets(report.mrr_history ?? []);
    const metricsRaw = (traction.metrics as { label: string; value: string }[] | undefined) ?? [];

    // 3 KPI boxes from report data
    const kpiItems: [string, string][] = [
      ["MRR", fmtNum(report.mrr, "₹")],
      ["MRR Growth", typeof report.mrr_growth_percent === "number" ? `${report.mrr_growth_percent}%` : "—"],
      ["Gross Margin", typeof report.gross_margin_percent === "number" ? `${report.gross_margin_percent}%` : "—"],
    ];
    kpiItems.forEach(([label, value], i) =>
      addMetricBox(s, label, value, 0.3 + i * 3.1, 0.92, 3.0, 1.0, T.green),
    );

    // Highlight bullets from traction slide
    const highlights = bullets(traction.highlights ?? metricsRaw.map((m) => `${m.label}: ${m.value}`));
    addBullets(s, highlights, { y: 2.08, color: T.text });

    // Simple bar chart if we have mrr_history (6 months)
    if (mrrHistory.length >= 2) {
      const chartData = [
        {
          name: "MRR",
          labels: mrrHistory.map((_, i) => `M-${mrrHistory.length - i}`).reverse(),
          values: mrrHistory.map((v) => parseFloat(v.replace(/[^0-9.]/g, "")) || 0),
        },
      ];
      try {
        s.addChart(prs.ChartType.bar, chartData, {
          x: 0.3, y: 2.1, w: 9.2, h: 3.0,
          barDir: "col",
          showLegend: false,
          chartColors: [T.accent],
          valAxisHidden: false,
          catAxisHidden: false,
          dataLabelColor: T.text,
          valAxisLabelFontSize: 9,
          catAxisLabelFontSize: 9,
        });
      } catch {
        // fallback — just show bullets if chart fails
      }
    }
  }
{
    const s = initSlide(prs, 5);
    addHeading(s, "Market Opportunity");
    const market = (slides.market as Record<string, unknown> | undefined) ?? {};
    addSubtitle(s, str(market.headline ?? ""));

    const markets = [
      { label: "TAM", value: str(market.tam ?? "—") },
      { label: "SAM", value: str(market.sam ?? "—") },
      { label: "SOM", value: str(market.som ?? "—") },
    ];
    markets.forEach((m, i) => addMetricBox(s, m.label, m.value, 0.3 + i * 3.15, 1.0, 3.0, 1.15, T.accent));

    if (market.growth_rate) {
      s.addText(`CAGR / Growth Rate: ${str(market.growth_rate)}`, {
        x: 0.3, y: 2.4, w: 9.2, h: 0.35,
        fontSize: 12, color: T.green, fontFace: "Arial", bold: true,
      });
    }
  }
{
    const s = initSlide(prs, 6);
    addHeading(s, "Product");
    const product = (slides.product as Record<string, unknown> | undefined) ?? {};
    addSubtitle(s, str(product.headline ?? ""));
    addBullets(s, bullets(product.features), { color: T.text });
    if (product.tech_stack) {
      s.addText(`Tech Stack: ${str(product.tech_stack)}`, {
        x: 0.3, y: 5.1, w: 9.2, h: 0.3,
        fontSize: 10, color: T.muted, fontFace: "Arial", italic: true,
      });
    }
  }
{
    const s = initSlide(prs, 7);
    addHeading(s, "Business Model");
    const bm = (slides.business_model as Record<string, unknown> | undefined) ?? {};
    addSubtitle(s, str(bm.headline ?? ""));
    addBullets(s, bullets(bm.revenue_streams), { color: T.text });
    if (bm.unit_economics) {
      s.addText(str(bm.unit_economics), {
        x: 0.3, y: 4.5, w: 9.2, h: 0.5,
        fontSize: 12, color: T.gray, fontFace: "Arial", italic: true,
      });
    }
  }
{
    const s = initSlide(prs, 8);
    addHeading(s, "Financials");

    const finSlide = (slides.financials as Record<string, unknown> | undefined) ?? {};
    const fKpis: [string, string, string][] = [
      ["MRR", fmtNum(report.mrr, "₹"), T.green],
      ["ARR", fmtNum(report.arr, "₹"), T.green],
      ["Burn Rate", fmtNum(report.burn_rate, "₹"), T.red],
      ["Runway", `${str(report.runway_months)} mo`, T.accent],
      ["Gross Margin", typeof report.gross_margin_percent === "number" ? `${report.gross_margin_percent}%` : "—", T.green],
      ["MRR Growth", typeof report.mrr_growth_percent === "number" ? `+${report.mrr_growth_percent}%` : "—", T.accent],
    ];

    fKpis.forEach(([label, value, accent], i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      addMetricBox(s, label, value, 0.3 + col * 3.15, 0.95 + row * 1.25, 3.0, 1.1, accent);
    });

    // Additional financial notes from slides.financials
    if (finSlide.headline) {
      s.addText(str(finSlide.headline), {
        x: 0.3, y: 3.55, w: 9.2, h: 0.4,
        fontSize: 12, color: T.gray, fontFace: "Arial", italic: true,
      });
    }
  }
{
    const s = initSlide(prs, 9);
    addHeading(s, "Team");
    const team = (slides.team as Record<string, unknown> | undefined) ?? {};
    addSubtitle(s, str(team.headline ?? "Leadership & Key Members"), 0.85);
    if (team.note) {
      s.addText(str(team.note), {
        x: 0.3, y: 1.3, w: 9.2, h: 3.8,
        fontSize: 13, color: T.text, fontFace: "Arial", wrap: true, valign: "top",
      });
    }
  }
{
    const s = prs.addSlide();
    s.background = { color: T.dark };
    s.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: 0.09, h: "100%", fill: { color: T.accent }, line: { color: T.accent } });

    const ask = (slides.ask as Record<string, unknown> | undefined) ?? {};
    s.addText("The Ask", {
      x: 0.3, y: 0.14, w: 9.4, h: 0.55,
      fontSize: 20, bold: true, color: T.white, fontFace: "Arial",
    });

    if (ask.amount) {
      s.addText(str(ask.amount), {
        x: 0.3, y: 0.85, w: 9.4, h: 1.1,
        fontSize: 48, bold: true, color: T.accent, fontFace: "Arial", align: "center",
      });
    }

    const funds = bullets(ask.use_of_funds);
    if (funds.length) {
      s.addText("USE OF FUNDS", {
        x: 0.3, y: 2.2, w: 4.5, h: 0.3,
        fontSize: 9, bold: true, color: T.muted, fontFace: "Arial", charSpacing: 2,
      });
      addBullets(s, funds, { y: 2.55, w: 4.5, h: 2.5, color: T.white });
    }

    const milestones = bullets(ask.milestones);
    if (milestones.length) {
      s.addText("MILESTONES", {
        x: 5.0, y: 2.2, w: 4.5, h: 0.3,
        fontSize: 9, bold: true, color: T.muted, fontFace: "Arial", charSpacing: 2,
      });
      addBullets(s, milestones, { x: 5.0, y: 2.55, w: 4.5, h: 2.5, color: T.white });
    }

    s.addText("Thank You", {
      x: 0.3, y: 5.1, w: 9.4, h: 0.35,
      fontSize: 11, color: T.muted, fontFace: "Arial", align: "center",
    });
  }
const pptxBuffer = (await prs.write({ outputType: "nodebuffer" })) as Buffer;
const storagePath = `${auth.userId}/${documentId}/pitch-deck.pptx`;
const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, new Uint8Array(pptxBuffer), {
      contentType:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      upsert: true,
    });
if (uploadErr) {
    return NextResponse.json(
      { error: `Storage upload failed: ${uploadErr.message}` },
      { status: 500 },
    );
  }
await supabase
    .from("finance_documents")
    .update({ file_url: storagePath })
    .eq("id", documentId);
const { data: signedData, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL);
if (signErr || !signedData) {
    return NextResponse.json({ error: "Could not create signed URL." }, { status: 500 });
  }
return NextResponse.json({ url: signedData.signedUrl, storagePath });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
