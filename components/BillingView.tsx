"use client";

import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
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

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadData = async (pageNumber: number = 0) => {
    if (pageNumber === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      if (pageNumber === 0) {
        const [billingRes, tenantRes, roomRes] = await Promise.all([
          endpoints.billing.getAll(pageNumber, 10),
          endpoints.tenants.getAll(0, 100),
          endpoints.rooms.getAll(0, 100),
        ]);
        setBillings(billingRes.data.content);
        setTenants(tenantRes.data.content);
        setRooms(roomRes.data.content);
        setHasMore(!billingRes.data.last);
      } else {
        const billingRes = await endpoints.billing.getAll(pageNumber, 10);
        setBillings((current) => [...current, ...billingRes.data.content]);
        setHasMore(!billingRes.data.last);
      }
      setPage(pageNumber);
    } catch (err) {
      setError("Could not load billing records. Check that the backend is running.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadData(0);
  }, []);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
      if (loading || loadingMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver(entries => {
          if (entries[0].isIntersecting && hasMore) {
              loadData(page + 1);
          }
      });
      if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore, page]);

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
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end md:gap-4">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#397052] dark:text-[#55a278] md:mb-2 md:text-xs">
            Financial ledger
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#202522] dark:text-gray-100">Billing & Invoices</h1>
          <p className="mt-1.5 text-sm leading-6 text-[#707770] dark:text-gray-400 md:mt-2">
            Track monthly billing statements, issue invoices, and print receipts.
          </p>
        </div>
        <button
          onClick={openNewBilling}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#397052] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2e5942] dark:bg-[#4d8a68] dark:hover:bg-[#397052] md:w-fit"
        >
          <PlusIcon weight="bold" /> Create Invoice
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 bg-[#e7e3d9] dark:bg-[#1a1a1a] p-1 w-fit rounded-md border border-transparent dark:border-white/10">
          {(["ALL", "UNPAID", "OVERDUE", "PAID"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                filter === option ? "bg-[#fbfaf7] text-[#202522] shadow-sm dark:bg-white/10 dark:text-gray-100" : "text-[#707770] hover:text-[#202522] dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {option === "ALL" ? "All Invoices" : option === "UNPAID" ? "Unpaid" : option === "OVERDUE" ? "Overdue" : "Paid"}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#858b84] dark:text-gray-500" size={16} />
          <input
            type="text"
            placeholder="Search tenant or room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-[#dcd9d1] bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#397052] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white dark:focus:border-[#55a278]"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="border-l-2 border-[#9d4937] bg-[#f8f7f3] px-4 py-3 text-sm text-[#9d4937] dark:border-[#e1684e] dark:bg-[#e1684e]/10 dark:text-[#e1684e]">
          {error}
        </p>
      )}

      {/* Invoices List Container */}
      <section className="overflow-hidden border border-[#dcd9d1] bg-[#f8f7f3] dark:border-white/10 dark:bg-[#1e1e1e]">
        {billings.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#707770] dark:text-gray-400">No invoice records found. Create an invoice to begin.</p>
        ) : (
          <>
            {/* Mobile Card Layout (< md screen width) */}
            <div className="divide-y divide-[#dcd9d1] dark:divide-white/10 md:hidden">
              {sortedBillings.map((bill) => (
                <div key={bill.id} className="p-4 space-y-3 bg-[#f8f7f3] dark:bg-[#1e1e1e]">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-base text-[#202522] dark:text-gray-100">
                        {bill.tenant?.fullName ?? "Unknown Tenant"}
                      </p>
                      <p className="text-xs text-[#707770] dark:text-gray-400">Room {bill.room?.roomNumber ?? "-"}</p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide shrink-0 ${
                        bill.status === "PAID"
                          ? "bg-[#dcecdf] text-[#397052] dark:bg-[#397052]/20 dark:text-[#55a278]"
                          : bill.status === "OVERDUE"
                          ? "bg-[#fbeae5] text-[#9d4937] dark:bg-[#9d4937]/20 dark:text-[#e1684e]"
                          : "bg-[#eee4d6] text-[#94613a] dark:bg-[#94613a]/20 dark:text-[#d39c71]"
                      }`}
                    >
                      {bill.status.toLowerCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-md border border-[#e5e2da] bg-[#efede7]/60 p-2.5 text-xs dark:border-white/10 dark:bg-white/5">
                    <div>
                      <span className="text-[#858b84] dark:text-gray-400 block">Due Date:</span>
                      <span className="font-medium text-[#202522] dark:text-gray-100">{formatDate(bill.dueDate)}</span>
                      {bill.datePaid && (
                        <p className="text-[10px] text-[#397052] dark:text-[#55a278] mt-0.5">Paid: {formatDate(bill.datePaid)}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[#858b84] dark:text-gray-400 block">Total Amount:</span>
                      <span className="text-sm font-bold text-[#202522] dark:text-gray-100">{formatCurrency(bill.totalAmount)}</span>
                    </div>
                  </div>

                  {/* Actions Toolbar for Mobile */}
                  <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1">
                    <button
                      onClick={() => setViewingBilling(bill)}
                      className="inline-flex items-center gap-1 rounded-md border border-[#cbc7bc] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#202522] hover:border-[#202522] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-gray-200 dark:hover:border-white/30 dark:hover:bg-white/5"
                    >
                      <EyeIcon size={14} /> View
                    </button>

                    {bill.status === "PAID" ? (
                      <button
                        onClick={() => setReceiptBilling(bill)}
                        className="inline-flex items-center gap-1 rounded-md border border-[#b4d2be] bg-[#edf6f0] px-2.5 py-1.5 text-xs font-semibold text-[#397052] hover:bg-[#dcecdf] dark:border-[#55a278]/30 dark:bg-[#397052]/10 dark:text-[#55a278] dark:hover:bg-[#397052]/20"
                      >
                        <ReceiptIcon size={14} /> Receipt
                      </button>
                    ) : (
                      <button
                        onClick={() => openSettleModal(bill)}
                        className="inline-flex items-center gap-1 rounded-md border border-[#b4d2be] bg-[#edf6f0] px-2.5 py-1.5 text-xs font-semibold text-[#397052] hover:border-[#397052] dark:border-[#55a278]/30 dark:bg-[#1a1a1a] dark:text-[#55a278] dark:hover:bg-[#397052]/10 dark:hover:border-[#55a278]/60"
                      >
                        <CheckCircleIcon size={14} /> Settle
                      </button>
                    )}

                    <button
                      onClick={() => openEditBilling(bill)}
                      className="inline-flex items-center gap-1 rounded-md border border-[#cbc7bc] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#202522] hover:border-[#202522] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-gray-200 dark:hover:border-white/30 dark:hover:bg-white/5"
                    >
                      <PencilSimpleIcon size={14} /> Edit
                    </button>
                    <button
                      onClick={() => setDeletingBilling(bill)}
                      className="inline-flex items-center gap-1 rounded-md border border-[#e1b8ae] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#9d4937] hover:border-[#9d4937] dark:border-[#e1684e]/30 dark:bg-[#1a1a1a] dark:text-[#e1684e] dark:hover:bg-[#e1684e]/10 dark:hover:border-[#e1684e]/60"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (>= md screen width) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-[#dcd9d1] dark:divide-white/10 text-left">
                <thead className="bg-[#efede7] dark:bg-white/5 text-xs font-semibold uppercase tracking-[0.12em] text-[#707770] dark:text-gray-400">
                  <tr>
                    <th className="px-5 py-3">Tenant & Room</th>
                    <th className="px-5 py-3">Due Date</th>
                    <th className="px-5 py-3">Total Amount</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e2da] dark:divide-white/10 text-sm text-[#202522] dark:text-gray-200">
                  {sortedBillings.map((bill) => (
                    <tr key={bill.id} className="bg-[#f8f7f3] transition-colors hover:bg-[#f3f0e8]/50 dark:bg-[#1e1e1e] dark:hover:bg-white/5">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-[#202522] dark:text-gray-100">{bill.tenant?.fullName ?? "Unknown Tenant"}</p>
                        <p className="text-xs text-[#707770] dark:text-gray-400">Room {bill.room?.roomNumber ?? "-"}</p>
                      </td>
                      <td className="px-5 py-3.5 text-[#5b625b] dark:text-gray-300">
                        <p>{formatDate(bill.dueDate)}</p>
                        {bill.datePaid && <p className="text-[11px] text-[#397052] dark:text-[#55a278]">Paid: {formatDate(bill.datePaid)}</p>}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-[#202522] dark:text-gray-100">{formatCurrency(bill.totalAmount)}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                            bill.status === "PAID"
                              ? "bg-[#dcecdf] text-[#397052] dark:bg-[#397052]/20 dark:text-[#55a278]"
                              : bill.status === "OVERDUE"
                              ? "bg-[#fbeae5] text-[#9d4937] dark:bg-[#9d4937]/20 dark:text-[#e1684e]"
                              : "bg-[#eee4d6] text-[#94613a] dark:bg-[#94613a]/20 dark:text-[#d39c71]"
                          }`}
                        >
                          {bill.status.toLowerCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1.5 sm:gap-2">
                          <button
                            onClick={() => setViewingBilling(bill)}
                            className="inline-flex items-center gap-1 rounded-md border border-[#cbc7bc] px-2.5 py-1.5 text-xs font-semibold text-[#202522] hover:border-[#202522] dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5 dark:hover:border-white/30"
                            title="View statement details"
                          >
                            <EyeIcon size={14} /> View
                          </button>

                          {bill.status === "PAID" ? (
                            <button
                              onClick={() => setReceiptBilling(bill)}
                              className="inline-flex items-center gap-1 rounded-md border border-[#b4d2be] bg-[#edf6f0] px-2.5 py-1.5 text-xs font-semibold text-[#397052] hover:bg-[#dcecdf] dark:border-[#55a278]/30 dark:bg-[#397052]/10 dark:text-[#55a278] dark:hover:bg-[#397052]/20"
                              title="Print Official Receipt"
                            >
                              <ReceiptIcon size={14} /> Receipt
                            </button>
                          ) : (
                            <button
                              onClick={() => openSettleModal(bill)}
                              className="inline-flex items-center gap-1 rounded-md border border-[#b4d2be] px-2.5 py-1.5 text-xs font-semibold text-[#397052] hover:border-[#397052] dark:border-[#55a278]/30 dark:text-[#55a278] dark:hover:bg-[#397052]/10 dark:hover:border-[#55a278]/60"
                            >
                              <CheckCircleIcon size={14} /> Settle
                            </button>
                          )}

                          <button
                            onClick={() => openEditBilling(bill)}
                            className="inline-flex items-center gap-1 rounded-md border border-[#cbc7bc] px-2.5 py-1.5 text-xs font-semibold text-[#202522] hover:border-[#202522] dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5 dark:hover:border-white/30"
                          >
                            <PencilSimpleIcon size={14} /> Edit
                          </button>
                          <button
                            onClick={() => setDeletingBilling(bill)}
                            className="inline-flex items-center gap-1 rounded-md border border-[#e1b8ae] px-2.5 py-1.5 text-xs font-semibold text-[#9d4937] hover:border-[#9d4937] dark:border-[#e1684e]/30 dark:text-[#e1684e] dark:hover:bg-[#e1684e]/10 dark:hover:border-[#e1684e]/60"
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
        {loadingMore && (
          <div className="py-4 flex justify-center items-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#397052] border-t-transparent"></div>
          </div>
        )}
        <div ref={lastElementRef} className="h-2 w-full" />
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