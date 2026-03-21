"use client";

import { useState, useCallback } from "react";

export type ExportType = "pdf" | "docx" | "pptx" | "xlsx";

const ENDPOINT_MAP: Record<ExportType, string> = {
  pdf: "/api/finance/export/pdf",
  docx: "/api/finance/export/docx",
  pptx: "/api/finance/export/pptx",
  xlsx: "/api/finance/export/xlsx",
};




interface UseFinanceExportOptions {
  documentId: string;
  fileBaseName?: string;
}

interface ExportState {
  isLoading: boolean;
  error: string | null;
}

export function useFinanceExport({ documentId, fileBaseName = "document" }: UseFinanceExportOptions) {
  const [states, setStates] = useState<Record<ExportType, ExportState>>({
    pdf: { isLoading: false, error: null },
    docx: { isLoading: false, error: null },
    pptx: { isLoading: false, error: null },
    xlsx: { isLoading: false, error: null },
  });

  const triggerDownload = useCallback(
    async (exportType: ExportType) => {
      setStates((prev) => ({
        ...prev,
        [exportType]: { isLoading: true, error: null },
      }));

      try {
        const res = await fetch(ENDPOINT_MAP[exportType], {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId }),
        });

        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(json.error ?? `Export failed (HTTP ${res.status})`);
        }

        // Routes return { url: signedUrl } after uploading to Supabase storage
        const json = (await res.json()) as { url?: string; error?: string };
        if (!json.url) throw new Error(json.error ?? "No download URL returned.");

        const anchor = document.createElement("a");
        anchor.href = json.url;
        anchor.download = `${fileBaseName}.${exportType}`;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);

        setStates((prev) => ({
          ...prev,
          [exportType]: { isLoading: false, error: null },
        }));
      } catch (err) {
        setStates((prev) => ({
          ...prev,
          [exportType]: {
            isLoading: false,
            error: err instanceof Error ? err.message : "Export failed. Try again.",
          },
        }));
      }
    },
    [documentId, fileBaseName],
  );

  const clearError = useCallback((exportType: ExportType) => {
    setStates((prev) => ({
      ...prev,
      [exportType]: { ...prev[exportType], error: null },
    }));
  }, []);

  return {
    triggerDownload,
    clearError,
    isLoading: (t: ExportType) => states[t].isLoading,
    error: (t: ExportType) => states[t].error,
    anyLoading: Object.values(states).some((s) => s.isLoading),
  };
}
