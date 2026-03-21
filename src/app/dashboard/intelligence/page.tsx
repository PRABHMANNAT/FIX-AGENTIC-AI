"use client";

import { Loader2, Plus, Sprout } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import HealthScore from "@/components/ui/HealthScore";
import LoadingShimmer from "@/components/ui/LoadingShimmer";
import RootCausePanel from "@/components/agents/RootCausePanel";
import { DEMO_USER_ID, demoIntelligenceAnalyses, demoProducts, generateMockIntelligenceAnalysis } from "@/lib/demo-data";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { formatTimestamp } from "@/lib/utils";
import type { IntelligenceAnalysis, Product } from "@/types";

export default function IntelligencePage() {
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [products, setProducts] = useState<Product[]>(demoProducts);
  const [selectedProductId, setSelectedProductId] = useState<string>(demoProducts[0]?.id ?? "");
  const [analysis, setAnalysis] = useState<IntelligenceAnalysis | null>(
    demoIntelligenceAnalyses[demoProducts[0]?.name] ?? null,
  );
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  const safeAnalysis =
    analysis &&
    Array.isArray(analysis.root_causes) &&
    Array.isArray(analysis.fix_paths) &&
    typeof analysis.summary === "string"
      ? analysis
      : selectedProduct
        ? generateMockIntelligenceAnalysis(selectedProduct)
        : null;

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);

      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("products")
        .select("*")
        .order("updated_at", { ascending: false });

      if (!active) {
        return;
      }

      const nextProducts = data?.length ? data : demoProducts;
      setProducts(nextProducts);
      setSelectedProductId(nextProducts[0]?.id ?? "");
      setAnalysis(
        nextProducts[0]
          ? demoIntelligenceAnalyses[nextProducts[0].name] ?? generateMockIntelligenceAnalysis(nextProducts[0])
          : null,
      );
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!selectedProduct) {
      setAnalysis(null);
      return;
    }

    setAnalysis((current) =>
      current?.product_name === selectedProduct.name
        ? current
        : demoIntelligenceAnalyses[selectedProduct.name] ?? generateMockIntelligenceAnalysis(selectedProduct),
    );
  }, [selectedProduct]);

  const addProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: Product = {
      id: crypto.randomUUID(),
      user_id: DEMO_USER_ID,
      name: form.name,
      description: form.description,
      health_score: 62,
      metrics: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data } = await supabase
        .from("products")
        .insert({
          user_id: user?.id ?? DEMO_USER_ID,
          name: payload.name,
          description: payload.description,
          metrics: payload.metrics,
          health_score: payload.health_score,
        })
        .select("*")
        .single();

      if (data) {
        payload.id = data.id;
        payload.user_id = data.user_id;
        payload.created_at = data.created_at;
        payload.updated_at = data.updated_at;
      }
    }

    setProducts((current) => [payload, ...current]);
    setSelectedProductId(payload.id);
    setAnalysis(generateMockIntelligenceAnalysis(payload));
    setForm({ name: "", description: "" });
    setShowAddForm(false);
  };

  const runAnalysis = async () => {
    if (!selectedProduct) {
      return;
    }

    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/intelligence", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          productData: selectedProduct,
          userId: DEMO_USER_ID,
        }),
      });

      if (!response.ok) {
        throw new Error("Analysis request failed.");
      }

      const nextAnalysis = (await response.json()) as IntelligenceAnalysis;
      setAnalysis(nextAnalysis);
      setProducts((current) =>
        current.map((product) =>
          product.id === selectedProduct.id
            ? { ...product, health_score: nextAnalysis.health_score, updated_at: new Date().toISOString() }
            : product,
        ),
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen animate-fade-in px-6 py-8 lg:px-8">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <div className="font-display text-[52px] uppercase leading-none tracking-[0.05em] text-white">
            Why Sales Are Dropping
          </div>
          <div className="mt-2 font-syne text-sm text-text-secondary">
            See what may be hurting sales, what evidence points to it, and what to fix first.
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <button type="button" onClick={() => setShowAddForm((current) => !current)} className="button-primary w-full justify-center">
            <Plus className="h-4 w-4" strokeWidth={2} />
            Add Offer
          </button>

          {showAddForm ? (
            <form onSubmit={addProduct} className="panel grid-surface space-y-4 p-4">
              <div className="system-label text-text-muted">New Offer</div>
              <input
                required
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="input-shell w-full"
                placeholder="Offer Name"
              />
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                className="input-shell h-28 w-full resize-none"
                placeholder="What do you sell here?"
              />
              <button type="submit" className="button-primary w-full justify-center">
                Save Offer
              </button>
            </form>
          ) : null}

          <div className="space-y-3">
            {loading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="rounded-md border border-border bg-[#090909] p-4">
                    <LoadingShimmer className="h-16 w-full" />
                  </div>
                ))
              : products.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => setSelectedProductId(product.id)}
                    className={`panel grid-surface w-full p-4 text-left ${
                      product.id === selectedProductId
                        ? "border-[rgba(0,255,136,0.2)]"
                        : "panel-hover"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-display text-3xl uppercase leading-none text-white">
                          {product.name}
                        </div>
                        <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.22em] text-text-micro">
                          Last Scan / {formatTimestamp(product.updated_at)}
                        </div>
                      </div>
                      <HealthScore value={product.health_score} size={72} />
                    </div>
                  </button>
                ))}
          </div>
        </aside>

        <section className="space-y-6">
          {selectedProduct ? (
            <>
              <div className="panel panel-tint-cyan grid-surface p-5">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="system-label text-text-muted">Selected Offer</div>
                    <div className="mt-3 font-display text-5xl uppercase leading-none text-white">
                      {selectedProduct.name}
                    </div>
                    <p className="comfort-copy mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">
                      {selectedProduct.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <HealthScore value={analysis?.health_score ?? selectedProduct.health_score} size={110} />
                    <button type="button" onClick={() => void runAnalysis()} className="button-primary min-w-[170px] justify-center">
                      {isAnalyzing ? (
                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                      ) : (
                        <Sprout className="h-4 w-4" strokeWidth={2} />
                      )}
                      Check What Is Wrong
                    </button>
                  </div>
                </div>
              </div>

              {safeAnalysis ? (
                <RootCausePanel analysis={safeAnalysis} />
              ) : (
                <div className="panel grid-surface p-6">
                  <div className="system-label text-text-muted">Awaiting Analysis</div>
                  <p className="comfort-copy mt-4 text-sm text-text-secondary">
                    Select a product and run the intelligence agent to surface ranked failure points.
                  </p>
                </div>
              )}
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
