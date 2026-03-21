import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserContext, createAdminClient } from "@/lib/supabase";
import ExcelJS from "exceljs";
import type { CashFlowProjection, CashFlowScenario } from "@/types/finance";

export async function POST(req: NextRequest): Promise<NextResponse | Response> {
  try {
    const auth = await getAuthenticatedUserContext();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { documentId } = await req.json();
    if (!documentId) return NextResponse.json({ error: "Missing documentId" }, { status: 400 });

    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: "DB not configured" }, { status: 503 });

    // 1. Fetch document
    const { data: document, error: fetchErr } = await supabase
      .from("finance_documents")
      .select("content_json")
      .eq("id", documentId)
      .eq("user_id", auth.userId)
      .single();

    if (fetchErr || !document || !document.content_json) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const projection = document.content_json as unknown as CashFlowProjection;

    // 3. Build workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "AssembleOne AI";
    workbook.created = new Date();

    const inrFormat = `"₹"##,##,##0.00`;

    const buildScenarioSheet = (sheetName: string, scenario: CashFlowScenario) => {
      const sheet = workbook.addWorksheet(sheetName);

      // Title
      sheet.mergeCells("A1:E1");
      const titleCell = sheet.getCell("A1");
      titleCell.value = `${sheetName} Cash Flow Projection`;
      titleCell.font = { size: 16, bold: true };

      // Headers (Row 3)
      const headersRow = sheet.getRow(3);
      headersRow.values = ["Month", "Revenue (₹)", "Expenses (₹)", "Net Cash Flow (₹)", "Cash Balance (₹)"];
      headersRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      
      headersRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF666666" },
        };
      });

      // Data Rows
      scenario.months.forEach((m, idx) => {
        const row = sheet.getRow(idx + 4);
        row.values = [m.month, m.revenue, m.expenses, m.net_cash_flow, m.cash_balance];
        
        // Formats
        [2, 3, 4, 5].forEach(colIndex => {
          row.getCell(colIndex).numFmt = inrFormat;
        });

        // Conditional Formatting on Net Cash Flow
        const netCashCell = row.getCell(4);
        if (m.net_cash_flow > 0) {
          netCashCell.font = { color: { argb: "FF008000" } }; // Green
        } else if (m.net_cash_flow < 0) {
          netCashCell.font = { color: { argb: "FFFF0000" } }; // Red
        }
      });

      const lastDataRow = scenario.months.length + 3;

      // Summary
      if (scenario.break_even_month) {
        sheet.getCell(`A${lastDataRow + 2}`).value = "Break Even Month:";
        sheet.getCell(`B${lastDataRow + 2}`).value = scenario.break_even_month;
        sheet.getCell(`A${lastDataRow + 2}`).font = { bold: true };
      }

      if (scenario.runway_end_month) {
        sheet.getCell(`A${lastDataRow + 3}`).value = "Runway End:";
        sheet.getCell(`B${lastDataRow + 3}`).value = scenario.runway_end_month;
        sheet.getCell(`A${lastDataRow + 3}`).font = { bold: true };
      }

      // Auto-fit basically
      sheet.columns.forEach((column) => {
        column.width = 18;
      });
      sheet.getColumn(1).width = 14; 
    };

    buildScenarioSheet("Base Case", projection.base);
    buildScenarioSheet("Best Case", projection.best);
    buildScenarioSheet("Worst Case", projection.worst);

    // Summary Sheet
    const summarySheet = workbook.addWorksheet("Summary & Analysis");
    summarySheet.getColumn(1).width = 15;
    summarySheet.getColumn(2).width = 40;
    
    summarySheet.mergeCells("A1:B1");
    summarySheet.getCell("A1").value = "Executive Summary";
    summarySheet.getCell("A1").font = { size: 16, bold: true };

    summarySheet.getCell("A3").value = "Analysis:";
    summarySheet.getCell("A3").font = { bold: true };
    summarySheet.getCell("B3").value = projection.analysis_text;
    summarySheet.getCell("B3").alignment = { wrapText: true, vertical: 'top' };
    summarySheet.getRow(3).height = 40;

    let currentRow = 5;
    summarySheet.getCell(`A${currentRow}`).value = "Final Cash Balances:";
    summarySheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow++;

    const getFinalBalance = (scenario: CashFlowScenario) => {
      if (scenario.months.length === 0) return 0;
      return scenario.months[scenario.months.length - 1].cash_balance;
    };

    summarySheet.getCell(`A${currentRow}`).value = "Base Case:";
    summarySheet.getCell(`B${currentRow}`).value = getFinalBalance(projection.base);
    summarySheet.getCell(`B${currentRow}`).numFmt = inrFormat;
    currentRow++;

    summarySheet.getCell(`A${currentRow}`).value = "Best Case:";
    summarySheet.getCell(`B${currentRow}`).value = getFinalBalance(projection.best);
    summarySheet.getCell(`B${currentRow}`).numFmt = inrFormat;
    currentRow++;

    summarySheet.getCell(`A${currentRow}`).value = "Worst Case:";
    summarySheet.getCell(`B${currentRow}`).value = getFinalBalance(projection.worst);
    summarySheet.getCell(`B${currentRow}`).numFmt = inrFormat;
    currentRow += 2;

    summarySheet.getCell(`A${currentRow}`).value = "Recommendations:";
    summarySheet.getCell(`A${currentRow}`).font = { bold: true };
    currentRow++;

    projection.recommendations.forEach((rec, idx) => {
      summarySheet.getCell(`B${currentRow}`).value = `${idx + 1}. ${rec}`;
      summarySheet.getCell(`B${currentRow}`).alignment = { wrapText: true };
      currentRow++;
    });

    // 4. Write to buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // 5. Upload to Supabase Storage
    const fileName = `cashflow_${documentId}_${Date.now()}.xlsx`;
    const { error: uploadError } = await supabase.storage
      .from("finance-exports")
      .upload(fileName, buffer, {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage Error:", uploadError);
      return NextResponse.json({ error: "Failed to upload XLSX to storage" }, { status: 500 });
    }

    // 6. Return signed URL
    const { data: signData, error: signError } = await supabase.storage
      .from("finance-exports")
      .createSignedUrl(fileName, 3600); // 1 hour

    if (signError || !signData) {
      return NextResponse.json({ error: "Failed to create signed URL" }, { status: 500 });
    }

    return NextResponse.json({ url: signData.signedUrl });

  } catch (err) {
    console.error("XLSX export error:", err);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
