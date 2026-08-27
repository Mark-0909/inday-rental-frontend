"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircleIcon,
  EyeIcon,
  PencilSimpleIcon,
  PlusIcon,
  ReceiptIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react";
import { endpoints } from "@/api/clients";
import { Billing, Room, Tenant } from "@/types";
import ViewBillingModal from "./billing/ViewBillingModal";
import ReceiptBillingModal from "./billing/ReceiptBillingModal";
import EditBillingModal from "./billing/EditBillingModal";
import SettleBillingModal from "./billing/SettleBillingModal";
import DeleteBillingModal from "./billing/DeleteBillingModal";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function BillingPage() {
  const [billings, setBillings] = useState<Billing[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingBilling, setEditingBilling] = useState<Billing | null>(null);
  
  const [viewingBilling, setViewingBilling] = useState<Billing | null>(null);
  const [receiptBilling, setReceiptBilling] = useState<Billing | null>(null);
  const [settlingBilling, setSettlingBilling] = useState<Billing | null>(null);
  const [deletingBilling, setDeletingBilling] = useState<Billing | null>(null);

  const [filter, setFilter] = useState<"ALL" | "PAID" | "UNPAID" | "OVERDUE">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = () => {
    Promise.all([
      endpoints.billing.getAll(),
      endpoints.tenants.getAll(),
      endpoints.rooms.getAll(),
    ])
      .then(([billingRes, tenantRes, roomRes]) => {
        setBillings(billingRes.data);
        setTenants(tenantRes.data);
        setRooms(roomRes.data);
      })
      .catch(() => {
        setError("Could not load billing records. Check that the backend is running.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewBilling = () => {
    setError(null);
    setEditingBilling(null);
    setIsEditorOpen(true);
  };

  const openEditBilling = (billing: Billing) => {
    setError(null);
    setEditingBilling(billing);
    setIsEditorOpen(true);
  };

  const openSettleModal = (billing: Billing) => {
    setError(null);
    setSettlingBilling(billing);
  };

  const sortedBillings = useMemo(() => {
    return [...billings]
      .filter((b) => {
        if (filter !== "ALL" && b.status !== filter) return false;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const tenantMatch = b.tenant?.fullName?.toLowerCase().includes(query) ?? false;
          const roomMatch = b.room?.roomNumber?.toLowerCase().includes(query) ?? false;
          return tenantMatch || roomMatch;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.status === b.status) return new Date(b.billingDate).getTime() - new Date(a.billingDate).getTime();
        if (a.status === "UNPAID" || a.status === "OVERDUE") return -1;
        return 1;
      });
  }, [billings, filter, searchQuery]);

  if (loading) return <p className="text-sm text-[#707770]">Loading billing ledger...</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
      {/* Precision Print Engine for Receipts */}
      <style jsx global>{`
        @page {
          margin: 0;
          size: auto;
        }
        @media print {
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-receipt-modal,
          #printable-receipt-modal * {
            visibility: visible !important;
          }
          #printable-receipt-modal {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
            background: transparent !important;
            width: auto !important;
            height: auto !important;
          }
          #printable-receipt-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            margin: 0 !important;
            padding: 16px 14px !important;
            width: 82mm !important;
            max-width: 82mm !important;
            box-shadow: none !important;
            border: 1px dashed #9ca3af !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            display: block !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          #receipt-watermark-bg {
            display: flex !important;
            visibility: visible !important;
            opacity: 0.08 !important;
          }
          #receipt-watermark-bg * {
            visibility: visible !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end md:gap-4">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#397052] md:mb-2 md:text-xs">
            Financial ledger
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#202522]">Billing & Invoices</h1>
          <p className="mt-1.5 text-sm leading-6 text-[#707770] md:mt-2">
            Track monthly billing statements, issue invoices, and print receipts.
          </p>
        </div>
        <button
          onClick={openNewBilling}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#397052] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2e5942] md:w-fit"
        >
          <PlusIcon weight="bold" /> Create Invoice
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 bg-[#e7e3d9] p-1 w-fit rounded-md">
          {(["ALL", "UNPAID", "OVERDUE", "PAID"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filter === option ? "bg-[#fbfaf7] text-[#202522] shadow-sm" : "text-[#707770] hover:text-[#202522]"
              }`}
            >
              {option === "ALL" ? "All Invoices" : option === "UNPAID" ? "Unpaid" : option === "OVERDUE" ? "Overdue" : "Paid"}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#858b84]" size={16} />
          <input
            type="text"
            placeholder="Search tenant or room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-[#dcd9d1] bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#397052]"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="border-l-2 border-[#9d4937] bg-[#f8f7f3] px-4 py-3 text-sm text-[#9d4937]">
          {error}
        </p>
      )}

      {/* Invoices List Container */}
      <section className="overflow-hidden border border-[#dcd9d1] bg-[#f8f7f3]">
        {billings.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#707770]">No invoice records found. Create an invoice to begin.</p>
        ) : (
          <>
            {/* Mobile Card Layout (< md screen width) */}
            <div className="divide-y divide-[#dcd9d1] md:hidden">
              {sortedBillings.map((bill) => (
                <div key={bill.id} className="p-4 space-y-3 bg-[#f8f7f3]">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-base text-[#202522]">
                        {bill.tenant?.fullName ?? "Unknown Tenant"}
                      </p>
                      <p className="text-xs text-[#707770]">Room {bill.room?.roomNumber ?? "-"}</p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide shrink-0 ${
                        bill.status === "PAID"
                          ? "bg-[#dcecdf] text-[#397052]"
                          : bill.status === "OVERDUE"
                          ? "bg-[#fbeae5] text-[#9d4937]"
                          : "bg-[#eee4d6] text-[#94613a]"
                      }`}
                    >
                      {bill.status.toLowerCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-md border border-[#e5e2da] bg-[#efede7]/60 p-2.5 text-xs">
                    <div>
                      <span className="text-[#858b84] block">Due Date:</span>
                      <span className="font-medium text-[#202522]">{formatDate(bill.dueDate)}</span>
                      {bill.datePaid && (
                        <p className="text-[10px] text-[#397052] mt-0.5">Paid: {formatDate(bill.datePaid)}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[#858b84] block">Total Amount:</span>
                      <span className="text-sm font-bold text-[#202522]">{formatCurrency(bill.totalAmount)}</span>
                    </div>
                  </div>

                  {/* Actions Toolbar for Mobile */}
                  <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1">
                    <button
                      onClick={() => setViewingBilling(bill)}
                      className="inline-flex items-center gap-1 rounded-md border border-[#cbc7bc] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#202522] hover:border-[#202522]"
                    >
                      <EyeIcon size={14} /> View
                    </button>

                    {bill.status === "PAID" ? (
                      <button
                        onClick={() => setReceiptBilling(bill)}
                        className="inline-flex items-center gap-1 rounded-md border border-[#b4d2be] bg-[#edf6f0] px-2.5 py-1.5 text-xs font-semibold text-[#397052] hover:bg-[#dcecdf]"
                      >
                        <ReceiptIcon size={14} /> Receipt
                      </button>
                    ) : (
                      <button
                        onClick={() => openSettleModal(bill)}
                        className="inline-flex items-center gap-1 rounded-md border border-[#b4d2be] bg-[#edf6f0] px-2.5 py-1.5 text-xs font-semibold text-[#397052] hover:border-[#397052]"
                      >
                        <CheckCircleIcon size={14} /> Settle
                      </button>
                    )}

                    <button
                      onClick={() => openEditBilling(bill)}
                      className="inline-flex items-center gap-1 rounded-md border border-[#cbc7bc] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#202522] hover:border-[#202522]"
                    >
                      <PencilSimpleIcon size={14} /> Edit
                    </button>
                    <button
                      onClick={() => setDeletingBilling(bill)}
                      className="inline-flex items-center gap-1 rounded-md border border-[#e1b8ae] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#9d4937] hover:border-[#9d4937]"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (>= md screen width) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-[#dcd9d1] text-left">
                <thead className="bg-[#efede7] text-xs font-semibold uppercase tracking-[0.12em] text-[#707770]">
                  <tr>
                    <th className="px-5 py-3">Tenant & Room</th>
                    <th className="px-5 py-3">Due Date</th>
                    <th className="px-5 py-3">Total Amount</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e2da] text-sm text-[#202522]">
                  {sortedBillings.map((bill) => (
                    <tr key={bill.id} className="bg-[#f8f7f3] transition-colors hover:bg-[#f3f0e8]/50">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-[#202522]">{bill.tenant?.fullName ?? "Unknown Tenant"}</p>
                        <p className="text-xs text-[#707770]">Room {bill.room?.roomNumber ?? "-"}</p>
                      </td>
                      <td className="px-5 py-3.5 text-[#5b625b]">
                        <p>{formatDate(bill.dueDate)}</p>
                        {bill.datePaid && <p className="text-[11px] text-[#397052]">Paid: {formatDate(bill.datePaid)}</p>}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-[#202522]">{formatCurrency(bill.totalAmount)}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                            bill.status === "PAID"
                              ? "bg-[#dcecdf] text-[#397052]"
                              : bill.status === "OVERDUE"
                              ? "bg-[#fbeae5] text-[#9d4937]"
                              : "bg-[#eee4d6] text-[#94613a]"
                          }`}
                        >
                          {bill.status.toLowerCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1.5 sm:gap-2">
                          <button
                            onClick={() => setViewingBilling(bill)}
                            className="inline-flex items-center gap-1 rounded-md border border-[#cbc7bc] px-2.5 py-1.5 text-xs font-semibold text-[#202522] hover:border-[#202522]"
                            title="View statement details"
                          >
                            <EyeIcon size={14} /> View
                          </button>

                          {bill.status === "PAID" ? (
                            <button
                              onClick={() => setReceiptBilling(bill)}
                              className="inline-flex items-center gap-1 rounded-md border border-[#b4d2be] bg-[#edf6f0] px-2.5 py-1.5 text-xs font-semibold text-[#397052] hover:bg-[#dcecdf]"
                              title="Print Official Receipt"
                            >
                              <ReceiptIcon size={14} /> Receipt
                            </button>
                          ) : (
                            <button
                              onClick={() => openSettleModal(bill)}
                              className="inline-flex items-center gap-1 rounded-md border border-[#b4d2be] px-2.5 py-1.5 text-xs font-semibold text-[#397052] hover:border-[#397052]"
                            >
                              <CheckCircleIcon size={14} /> Settle
                            </button>
                          )}

                          <button
                            onClick={() => openEditBilling(bill)}
                            className="inline-flex items-center gap-1 rounded-md border border-[#cbc7bc] px-2.5 py-1.5 text-xs font-semibold text-[#202522] hover:border-[#202522]"
                          >
                            <PencilSimpleIcon size={14} /> Edit
                          </button>
                          <button
                            onClick={() => setDeletingBilling(bill)}
                            className="inline-flex items-center gap-1 rounded-md border border-[#e1b8ae] px-2.5 py-1.5 text-xs font-semibold text-[#9d4937] hover:border-[#9d4937]"
                          >
                            <TrashIcon size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Render the Reusable Modals */}
      <ViewBillingModal
        billing={viewingBilling}
        onClose={() => setViewingBilling(null)}
        onOpenReceipt={setReceiptBilling}
      />

      <ReceiptBillingModal
        billing={receiptBilling}
        onClose={() => setReceiptBilling(null)}
      />

      <EditBillingModal
        isOpen={isEditorOpen}
        billing={editingBilling}
        tenants={tenants}
        rooms={rooms}
        onClose={() => setIsEditorOpen(false)}
        onSuccess={loadData}
      />

      <SettleBillingModal
        billing={settlingBilling}
        onClose={() => setSettlingBilling(null)}
        onSuccess={() => {
          loadData();
          setSettlingBilling(null);
          // Optional: Open receipt after settle
        }}
      />

      <DeleteBillingModal
        billing={deletingBilling}
        onClose={() => setDeletingBilling(null)}
        onSuccess={() => {
          loadData();
          setDeletingBilling(null);
        }}
      />
    </div>
  );
}