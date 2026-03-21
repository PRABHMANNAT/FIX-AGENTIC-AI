"use client";

import CustomerCard from "@/components/leads/CustomerCard";
import type { Lead, LeadStatus } from "@/types";

interface CustomerGridProps {
  customers: Lead[];
  loading?: boolean;
  onStatusChange?: (leadId: string, status: LeadStatus) => void;
}

export function CustomerGrid({ customers, loading, onStatusChange }: CustomerGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {loading
        ? Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="panel h-[320px] bg-[#090909]" />
          ))
        : customers.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} onStatusChange={onStatusChange} />
          ))}
    </div>
  );
}

export default CustomerGrid;
