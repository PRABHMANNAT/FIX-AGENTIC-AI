import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  TableLayoutType,
} from "docx";

const BUCKET = "finance-exports";
const SIGNED_URL_TTL = 3600;

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
const report = (content.report ?? {}) as Record<string, unknown>;
const period = content.period as { month?: string; year?: number } | undefined;
const str = (v: unknown): string =>
    typeof v === "string" ? v : typeof v === "number" ? String(v) : "";
const fmtNum = (v: unknown, prefix = ""): string =>
    typeof v === "number" ? `${prefix}${v.toLocaleString("en-IN")}` : str(v);
const fmtPct = (v: unknown) => (typeof v === "number" ? `${v}%` : "—");
const bulletArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map(String) : [];
const PURPLE = "7C3AED";
const GRAY = "6B7280";
const GREEN = "059669";
const RED = "DC2626";
const sectionHeading = (text: string) =>
    new Paragraph({
      text,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 320, after: 120 },
      border: {
        bottom: { color: "E5E7EB", size: 6, space: 4, style: BorderStyle.SINGLE },
      },
      children: [
        new TextRun({
          text,
          color: PURPLE,
          bold: true,
          size: 22,
          font: "Arial",
        }),
      ],
    });
const bulletPara = (text: string, color = "374151") =>
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({ text: "› ", color, bold: true, font: "Arial", size: 22 }),
        new TextRun({ text, color: "374151", font: "Arial", size: 22 }),
      ],
    });
const kpiRows: [string, string][] = [
    ["MRR", fmtNum(report.mrr, "₹")],
    ["ARR", fmtNum(report.arr, "₹")],
    ["MRR Growth", fmtPct(report.mrr_growth_percent)],
    ["Burn Rate", fmtNum(report.burn_rate, "₹")],
    ["Runway (months)", str(report.runway_months)],
    ["Gross Margin", fmtPct(report.gross_margin_percent)],
  ];
const kpiTable = new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      // Header row
      new TableRow({
        tableHeader: true,
        children: ["Metric", "Value"].map(
          (h) =>
            new TableCell({
              shading: { type: ShadingType.SOLID, color: PURPLE, fill: PURPLE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: h, color: "FFFFFF", bold: true, font: "Arial", size: 20 }),
                  ],
                }),
              ],
            }),
        ),
      }),
      // Data rows
      ...kpiRows.map(
        ([label, value], i) =>
          new TableRow({
            children: [label, value].map(
              (text) =>
                new TableCell({
                  shading: i % 2 === 1 ? { type: ShadingType.SOLID, color: "F9FAFB", fill: "F9FAFB" } : undefined,
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text, font: "Arial", size: 20 })],
                    }),
                  ],
                }),
            ),
          }),
      ),
    ],
  });
const docChildren = [
    // Title block
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: String(doc.title ?? "Investor Report"),
          bold: true,
          size: 44,
          font: "Arial",
          color: "111827",
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: `Period: ${period?.month ?? ""} ${period?.year ?? ""}  ·  `,
          size: 20,
          color: GRAY,
          font: "Arial",
        }),
        new TextRun({
          text: "CONFIDENTIAL",
          size: 18,
          bold: true,
          color: "B45309",
          font: "Arial",
        }),
      ],
    }),
    new Paragraph({
      text: "",
      border: {
        bottom: { color: PURPLE, size: 12, space: 4, style: BorderStyle.SINGLE },
      },
      spacing: { after: 280 },
    }),

    // Executive summary
    sectionHeading("Executive Summary"),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: str(report.executive_summary),
          font: "Arial",
          size: 22,
          color: "374151",
        }),
      ],
    }),

    // Financial snapshot
    sectionHeading("Financial Snapshot"),
    kpiTable,
    new Paragraph({ text: "", spacing: { after: 200 } }),

    // Key wins
    sectionHeading("Key Wins"),
    ...bulletArr(report.key_wins).map((w) => bulletPara(w, GREEN)),
    new Paragraph({ text: "", spacing: { after: 100 } }),

    // Risks
    sectionHeading("Risks"),
    ...bulletArr(report.risks).map((r) => bulletPara(r, RED)),
    new Paragraph({ text: "", spacing: { after: 100 } }),

    // Asks
    sectionHeading("Asks from Investors"),
    ...bulletArr(report.asks).map((a) => bulletPara(a, PURPLE)),
    new Paragraph({ text: "", spacing: { after: 100 } }),

    // Next month targets
    sectionHeading("Next Month Targets"),
    ...bulletArr(report.next_month_targets).map((t) => bulletPara(t, GRAY)),
    new Paragraph({ text: "", spacing: { after: 400 } }),

    // Footer
    new Paragraph({
      alignment: AlignmentType.CENTER,
      border: {
        top: { color: "E5E7EB", size: 6, space: 4, style: BorderStyle.SINGLE },
      },
      children: [
        new TextRun({
          text: `Generated by AssembleOne Finance Agent  ·  ${String(doc.title ?? "")}  ·  Confidential`,
          size: 16,
          color: "9CA3AF",
          font: "Arial",
        }),
      ],
    }),
  ];
const wordDoc = new Document({
    creator: "AssembleOne Finance Agent",
    title: String(doc.title ?? "Investor Report"),
    description: "Investor Report generated by AssembleOne",
    sections: [{ children: docChildren }],
  });
const buffer = await Packer.toBuffer(wordDoc);
const storagePath = `${auth.userId}/${documentId}/investor-report.docx`;
const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, new Uint8Array(buffer), {
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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
