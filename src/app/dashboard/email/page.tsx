"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import EmailPanel from "@/components/leads/EmailPanel";
import CustomerGrid from "@/components/leads/CustomerGrid";
import { demoLeads } from "@/lib/demo-data";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import type { EmailDraft, Lead, LeadStatus } from "@/types";

function EmailPageContent() {
  const searchParams = useSearchParams();
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [customers, setCustomers] = useState<Lead[]>(demoLeads);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedCustomerId = searchParams.get("customer");

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);

      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });

      if (!active) {
        return;
      }

      setCustomers(data?.length ? data : demoLeads);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [supabase]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) ?? customers[0] ?? null,
    [customers, selectedCustomerId],
  );

  const updateCustomerStatus = async (leadId: string, status: LeadStatus) => {
    setCustomers((current) =>
      current.map((customer) =>
        customer.id === leadId
          ? { ...customer, status, updated_at: new Date().toISOString() }
          : customer,
      ),
    );

    if (supabase) {
      await supabase.from("leads").update({ status }).eq("id", leadId);
    }
  };

  const writeEmail = async () => {
    if (!selectedCustomer) {
      return;
    }

    if (!selectedCustomer.email) {
      setError("No email found for this person - try reaching out on LinkedIn instead.");
      return;
    }

    setLoadingDraft(true);
    setError(null);

    try {
      const response = await fetch("/api/email/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lead_id: selectedCustomer.id,
          sender_name: "AssembleOne",
          sender_company: "AssembleOne",
          value_prop: "A simple way to find the right customers and send personal emails faster.",
        }),
      });

      const payload = (await response.json().catch(() => null)) as (EmailDraft & { error?: string }) | null;

      if (!response.ok || !payload) {
        throw new Error(payload?.error || "We couldn't write that email just now. Try again.");
      }

      setDraft(payload);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "We couldn't write that email just now. Try again.");
    } finally {
      setLoadingDraft(false);
    }
  };

  const sendEmail = async () => {
    if (!selectedCustomer || !selectedCustomer.email || !draft) {
      return;
    }

    setSendingEmail(true);
    setError(null);

    try {
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lead_id: selectedCustomer.id,
          to_email: selectedCustomer.email,
          subject: draft.subject,
          email_body: draft.body,
          sender_name: "AssembleOne",
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error || "We couldn't send that email. Try again.");
      }

      await updateCustomerStatus(selectedCustomer.id, "contacted");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "We couldn't send that email. Try again.");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="min-h-screen animate-fade-in px-6 py-8 lg:px-8">
      <div className="mb-8">
        <div className="font-display text-[52px] uppercase leading-none tracking-[0.05em] text-white">
          Email Outreach
        </div>
        <p className="comfort-copy mt-2 text-sm text-text-secondary">
          Pick a customer, write a short message, and send it without leaving your dashboard.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <CustomerGrid customers={customers} loading={loading} onStatusChange={updateCustomerStatus} />
        <EmailPanel
          customer={selectedCustomer}
          draft={draft}
          loadingDraft={loadingDraft}
          sendingEmail={sendingEmail}
          error={error}
          onWrite={() => void writeEmail()}
          onSend={() => void sendEmail()}
        />
      </div>
    </div>
  );
}

export default function EmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <EmailPageContent />
    </Suspense>
  );
}
