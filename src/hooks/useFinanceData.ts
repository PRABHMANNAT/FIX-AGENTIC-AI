"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { Anomaly, WeeklyBriefing, BurnData } from "@/types/finance";

interface StripeData {
  mrr?: number;
  arr?: number;
  churn_rate?: number;
  burn_rate?: number;
  runway_months?: number;
  cash_balance?: number;
  stripe_connected?: boolean;
  [key: string]: unknown;
}


interface FinanceSettings {
  company_name?: string;
  company_address?: string;
  gstin?: string;
  logo_url?: string;
  slack_webhook_url?: string;
  currency?: string;
  bank_details?: string;
  stripe_connected?: boolean;
  [key: string]: unknown;
}

interface SubscriptionsData {
  subscriptions: unknown[];
  total_monthly: number;
  total_yearly: number;
  potential_annual_savings: number;
  unused_count: number;
}

interface UseFinanceDataReturn {
  stripeData: StripeData | null;
  burnData: BurnData | null;
  anomalies: Anomaly[];
  briefings: WeeklyBriefing[];
  subscriptions: SubscriptionsData | null;
  settings: FinanceSettings | null;
  isConnected: boolean;
  isLoading: boolean;
  lastRefreshed: Date | null;
  refresh: () => void;
  syncStripe: () => Promise<void>;
  connectStripe: () => void;
  updateSettings: (data: Partial<FinanceSettings>) => Promise<void>;
  fetchErrors: Record<string, string>;
}

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

// Module-level cache
let cachedData: {
  stripeData: StripeData | null;
  burnData: BurnData | null;
  anomalies: Anomaly[];
  briefings: WeeklyBriefing[];
  subscriptions: SubscriptionsData | null;
  settings: FinanceSettings | null;
  fetchedAt: number | null;
} = {
  stripeData: null,
  burnData: null,
  anomalies: [],
  briefings: [],
  subscriptions: null,
  settings: null,
  fetchedAt: null,
};

async function fetchJSON<T>(url: string, key: string): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const errText = await res.text();
      console.error(`Fetch ${url} error:`, errText);
      return { data: null, error: errText || res.statusText };
    }
    return { data: (await res.json()) as T, error: null };
  } catch (err: any) {
    console.error(`Fetch ${url} error:`, err);
    return { data: null, error: err.message || "Failed to fetch" };
  }
}

export function useFinanceData(): UseFinanceDataReturn {
  const [stripeData, setStripeData] = useState<StripeData | null>(cachedData.stripeData);
  const [burnData, setBurnData] = useState<BurnData | null>(cachedData.burnData);
  const [anomalies, setAnomalies] = useState<Anomaly[]>(cachedData.anomalies);
  const [briefings, setBriefings] = useState<WeeklyBriefing[]>(cachedData.briefings);
  const [subscriptions, setSubscriptions] = useState<SubscriptionsData | null>(cachedData.subscriptions);
  const [settings, setSettings] = useState<FinanceSettings | null>(cachedData.settings);
  const [fetchErrors, setFetchErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const isMounted = useRef(true);

  const fetchAll = useCallback(async (force = false) => {
    // Skip if data is fresh
    if (!force && cachedData.fetchedAt && Date.now() - cachedData.fetchedAt < STALE_TIME) {
      setStripeData(cachedData.stripeData);
      setBurnData(cachedData.burnData);
      setAnomalies(cachedData.anomalies);
      setBriefings(cachedData.briefings);
      setSubscriptions(cachedData.subscriptions);
      setSettings(cachedData.settings);
      setIsLoading(false);
      setLastRefreshed(new Date(cachedData.fetchedAt));
      return;
    }

    setIsLoading(true);

    const [stripeRes, burnRes, anomalyRes, briefingRes, subRes, settingsRes] = await Promise.all([
      fetchJSON<StripeData>("/api/finance/stripe/data", "stripe"),
      fetchJSON<BurnData>("/api/finance/burn", "burn"),
      fetchJSON<{ anomalies: Anomaly[] }>("/api/finance/anomalies/list", "anomalies"),
      fetchJSON<{ briefings: WeeklyBriefing[] }>("/api/finance/briefing/history", "briefings"),
      fetchJSON<SubscriptionsData>("/api/finance/expenses/subscriptions", "subscriptions"),
      fetchJSON<FinanceSettings>("/api/finance/settings", "settings"),
    ]);

    if (!isMounted.current) return;

    const newErrors: Record<string, string> = {};
    if (stripeRes.error) newErrors.stripe = stripeRes.error;
    if (burnRes.error) newErrors.burn = burnRes.error;
    if (anomalyRes.error) newErrors.anomalies = anomalyRes.error;
    if (briefingRes.error) newErrors.briefings = briefingRes.error;
    if (subRes.error) newErrors.subscriptions = subRes.error;
    if (settingsRes.error) newErrors.settings = settingsRes.error;
    
    setFetchErrors(newErrors);

    const now = Date.now();
    const nextStripe = stripeRes.data || null;
    const nextBurn = burnRes.data || null;
    const nextAnomalies = anomalyRes.data?.anomalies || [];
    const nextBriefings = briefingRes.data?.briefings || [];
    const nextSubs = subRes.data || null;
    const nextSettings = settingsRes.data || null;

    cachedData = {
      stripeData: nextStripe,
      burnData: nextBurn,
      anomalies: nextAnomalies,
      briefings: nextBriefings,
      subscriptions: nextSubs,
      settings: nextSettings,
      fetchedAt: now,
    };

    setStripeData(nextStripe);
    setBurnData(nextBurn);
    setAnomalies(nextAnomalies);
    setBriefings(nextBriefings);
    setSubscriptions(nextSubs);
    setSettings(nextSettings);
    setIsLoading(false);
    setLastRefreshed(new Date(now));
  }, []);

  useEffect(() => {
    isMounted.current = true;
    void fetchAll();
    return () => { isMounted.current = false; };
  }, [fetchAll]);

  const refresh = useCallback(() => {
    void fetchAll(true);
  }, [fetchAll]);

  const syncStripe = useCallback(async () => {
    try {
      await fetch("/api/finance/stripe/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      void fetchAll(true);
    } catch (err) {
      console.error("Stripe sync error:", err);
    }
  }, [fetchAll]);

  const connectStripe = useCallback(() => {
    window.location.href = "/api/finance/stripe/connect";
  }, []);

  const updateSettings = useCallback(async (data: Partial<FinanceSettings>) => {
    try {
      const res = await fetch("/api/finance/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.settings) {
        setSettings(result.settings);
        cachedData.settings = result.settings;
      }
    } catch (err) {
      console.error("Settings update error:", err);
    }
  }, []);

  const isConnected = useMemo(() => {
    return !!(stripeData?.stripe_connected || settings?.stripe_connected);
  }, [stripeData?.stripe_connected, settings?.stripe_connected]);

  return {
    stripeData,
    burnData,
    anomalies,
    briefings,
    subscriptions,
    settings,
    isConnected,
    isLoading,
    lastRefreshed,
    refresh,
    syncStripe,
    connectStripe,
    updateSettings,
    fetchErrors,
  };
}
