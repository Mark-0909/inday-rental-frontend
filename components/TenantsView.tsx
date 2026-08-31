"use client";

import React, { FormEvent, useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
  ArrowSquareOutIcon,
  CheckCircleIcon,
  EyeIcon,
  PencilSimpleIcon,
  PlusIcon,
  ReceiptIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import Modal from "@/components/ui/Modal";
import { endpoints } from "@/api/clients";
import { Billing, Room, Tenant } from "@/types";
import ViewBillingModal from "./billing/ViewBillingModal";
import ReceiptBillingModal from "./billing/ReceiptBillingModal";
import EditBillingModal from "./billing/EditBillingModal";
import SettleBillingModal from "./billing/SettleBillingModal";
import DeleteBillingModal from "./billing/DeleteBillingModal";

type TenantDraft = {
  fullName: string;
  phone: string;
  moveInDate: string;
  moveOutDate: string;
  billingDate: string;
  status: Tenant["status"];
  roomId: string;
};

const emptyDraft: TenantDraft = {
  fullName: "",
  phone: "",
  moveInDate: "",
  moveOutDate: "",
  billingDate: "",
  status: "ACTIVE",
  roomId: "",
};

function dateInputValue(value: string | null | undefined) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function draftFromTenant(tenant: Tenant): TenantDraft {
  const assignedRoomId = tenant.room?.id ?? tenant.roomId ?? "";
  return {
    fullName: tenant.fullName,
    phone: tenant.phone,
    moveInDate: dateInputValue(tenant.moveInDate),
    moveOutDate: dateInputValue(tenant.moveOutDate),
    billingDate: dateInputValue(tenant.billingDate),
    status: tenant.status,
    roomId: String(assignedRoomId),
  };
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

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<TenantDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  const [movingOutTenant, setMovingOutTenant] = useState<Tenant | null>(null);
  const [moveOutDate, setMoveOutDate] = useState<string>("");
  const [processingMoveOut, setProcessingMoveOut] = useState(false);

  const [viewingTenant, setViewingTenant] = useState<Tenant | null>(null);
  const [tenantBillings, setTenantBillings] = useState<Billing[]>([]);
  const [loadingBillings, setLoadingBillings] = useState(false);

  // Billing Modal States
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingBilling, setEditingBilling] = useState<Billing | null>(null);
  const [viewingBillingModal, setViewingBillingModal] = useState<Billing | null>(null);
  const [receiptBilling, setReceiptBilling] = useState<Billing | null>(null);
  const [settlingBilling, setSettlingBilling] = useState<Billing | null>(null);
  const [deletingBilling, setDeletingBilling] = useState<Billing | null>(null);

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadData = async (pageNumber: number = 0) => {
    if (pageNumber === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      if (pageNumber === 0) {
        const [tenantResponse, roomResponse] = await Promise.all([
          endpoints.tenants.getAll(pageNumber, 10),
          endpoints.rooms.getAll(0, 100)
        ]);
        setTenants(tenantResponse.data.content);
        setRooms(roomResponse.data.content);
        setHasMore(!tenantResponse.data.last);
      } else {
        const tenantResponse = await endpoints.tenants.getAll(pageNumber, 10);
        setTenants((current) => [...current, ...tenantResponse.data.content]);
        setHasMore(!tenantResponse.data.last);
      }
      setPage(pageNumber);
    } catch (err) {
      setError("Could not load tenants. Check that the backend is running.");
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

  const editingTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === editingId) ?? null,
    [tenants, editingId]
  );

  const unavailableRoomIds = useMemo(() => {
    const ids = new Set<number>();
    tenants.forEach((tenant) => {
      const activeRoomId = tenant.room?.id ?? tenant.roomId;
      if (
        tenant.status?.toUpperCase() === "ACTIVE" &&
        tenant.id !== editingId &&
        activeRoomId
      ) {
        ids.add(Number(activeRoomId));
      }
    });
    return ids;
  }, [tenants, editingId]);

  const closeEditor = () => {
    setEditingId(null);
    setDraft(emptyDraft);
  };

  const updateDraft = (field: keyof TenantDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const openNewTenant = () => {
    setError(null);
    setDraft(emptyDraft);
    setEditingId(0);
  };

  const openEditTenant = (tenant: Tenant) => {
    setError(null);
    setEditingId(tenant.id);
    setDraft(draftFromTenant(tenant));
  };

  const openMoveOutModal = (tenant: Tenant) => {
    setError(null);
    setMovingOutTenant(tenant);
    setMoveOutDate(new Date().toISOString().slice(0, 10));
  };

  const openViewTenant = async (tenant: Tenant) => {
    setViewingTenant(tenant);
    setLoadingBillings(true);
    setTenantBillings([]);
    setError(null);
    try {
      const response = await endpoints.billing.getAll(0, 100);
      const allBillings: Billing[] = response.data.content || [];
      const filtered = allBillings.filter((b) => b.tenant?.id === tenant.id);
      setTenantBillings(filtered);
    } catch {
      setError("Could not load invoices for this tenant.");
    } finally {
      setLoadingBillings(false);
    }
  };

  const refreshTenantBillings = async () => {
    if (!viewingTenant) return;
    try {
      const response = await endpoints.billing.getAll(0, 100);
      const allBillings: Billing[] = response.data.content || [];
      const filtered = allBillings.filter((b) => b.tenant?.id === viewingTenant.id);
      setTenantBillings(filtered);
    } catch {
      // Background refresh, no UI error throw needed
    }
  };

  const saveTenant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.roomId) {
      setError("Please select a room for this tenant.");
      return;
    }
    setSaving(true);
    setError(null);

    const isInactive = draft.status === "INACTIVE";
    const selectedRoomId = Number(draft.roomId);

    const payload = {
      fullName: draft.fullName.trim(),
      phone: draft.phone.trim(),
      moveInDate: draft.moveInDate || null,
      moveOutDate: isInactive
        ? draft.moveOutDate || new Date().toISOString().slice(0, 10)
        : draft.moveOutDate || null,
      billingDate: draft.billingDate || null,
      status: draft.status,
      roomId: selectedRoomId,
    };

    try {
      if (editingId) {
        await endpoints.tenants.update(editingId, payload);
      } else {
        await endpoints.tenants.register(payload);
      }

      loadData();
      closeEditor();
    } catch (saveError: unknown) {
      const typedError = saveError as {
        message?: string;
        response?: { status?: number; data?: { message?: string } | string };
      };
      const responseMessage =
        typeof typedError.response?.data === "string"
          ? typedError.response.data
          : typedError.response?.data?.message;
      const status = typedError.response?.status ? ` (${typedError.response.status})` : "";
      setError(`${responseMessage ?? typedError.message ?? "Could not save this tenant."}${status}`);
    } finally {
      setSaving(false);
    }
  };

  const confirmMoveOut = async () => {
    if (!movingOutTenant) return;
    setProcessingMoveOut(true);
    setError(null);

    const activeRoomId = movingOutTenant.room?.id ?? movingOutTenant.roomId;
    const checkoutDate = moveOutDate || new Date().toISOString().slice(0, 10);

    const payload = {
      fullName: movingOutTenant.fullName,
      phone: movingOutTenant.phone,
      moveInDate: movingOutTenant.moveInDate || null,
      moveOutDate: checkoutDate,
      billingDate: movingOutTenant.billingDate || null,
      status: "INACTIVE",
      roomId: Number(activeRoomId),
    };

    try {
      await endpoints.tenants.update(movingOutTenant.id, payload);
      loadData();
      setMovingOutTenant(null);
    } catch (moveOutErr: unknown) {
      const typedError = moveOutErr as {
        message?: string;
        response?: { status?: number; data?: { message?: string } | string };
      };
      const responseMessage =
        typeof typedError.response?.data === "string"
          ? typedError.response.data
          : typedError.response?.data?.message;
      const status = typedError.response?.status ? ` (${typedError.response.status})` : "";
      setError(`${responseMessage ?? typedError.message ?? "Could not update move-out status."}${status}`);
    } finally {
      setProcessingMoveOut(false);
    }
  };

  const sortedTenants = useMemo(() => {
    return [...tenants].sort((a, b) => {
      if (a.status === b.status) return 0;
      return a.status === "ACTIVE" ? -1 : 1;
    });
  }, [tenants]);

  const currentEditingRoomId = Number(
    editingTenant?.room?.id ?? editingTenant?.roomId ?? draft.roomId
  );

  const selectableRooms = useMemo(() => {
    return rooms.filter(
      (room) => room.status !== "MAINTENANCE" || room.id === Number(draft.roomId)
    );
  }, [rooms, draft.roomId]);

  if (loading) return <p className="text-sm text-[#707770]">Loading tenants...</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end md:gap-4">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#397052] dark:text-[#55a278] md:mb-2 md:text-xs">
            Resident directory
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#202522] dark:text-gray-100">Tenants</h1>
          <p className="mt-1.5 text-sm leading-6 text-[#707770] dark:text-gray-400 md:mt-2">
            Track residents, assigned rooms, and occupancy status.
          </p>
        </div>
        <button
          onClick={openNewTenant}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#397052] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2e5942] dark:bg-[#4d8a68] dark:hover:bg-[#397052] md:w-fit"
        >
          <PlusIcon weight="bold" /> Add tenant
        </button>
      </div>

      {error && (
        <p role="alert" className="border-l-2 border-[#9d4937] bg-[#f8f7f3] px-4 py-3 text-sm text-[#9d4937]">
          {error}
        </p>
      )}

      <section className="overflow-hidden border border-[#dcd9d1] bg-[#f8f7f3] dark:border-white/10 dark:bg-[#1e1e1e]">
        {tenants.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#707770] dark:text-gray-400">
            No tenants yet. Add your first tenant to get started.
          </p>
        ) : (
          <div className="overflow-hidden">
            {/* Mobile Card Layout (< md screen width) */}
            <div className="divide-y divide-[#dcd9d1] dark:divide-white/10 md:hidden">
              {sortedTenants.map((tenant) => (
                <div key={tenant.id} className="p-4 space-y-3 bg-[#f8f7f3] dark:bg-[#1e1e1e]">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-base text-[#202522] dark:text-gray-100">{tenant.fullName}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide shrink-0 ${
                        tenant.status === "ACTIVE"
                          ? "bg-[#dcecdf] text-[#397052] dark:bg-[#397052]/20 dark:text-[#55a278]"
                          : "bg-[#eee4d6] text-[#94613a] dark:bg-[#94613a]/20 dark:text-[#d39c71]"
                      }`}
                    >
                      {tenant.status.toLowerCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-md border border-[#e5e2da] dark:border-white/10 bg-[#efede7]/60 dark:bg-white/5 p-2.5 text-xs">
                    <div>
                      <span className="text-[#858b84] dark:text-gray-400 block">Contact:</span>
                      <span className="font-medium text-[#202522] dark:text-gray-100">{tenant.phone}</span>
                    </div>
                    <div>
                      <span className="text-[#858b84] dark:text-gray-400 block">Room:</span>
                      <span className="font-medium text-[#202522] dark:text-gray-100">
                        {tenant.status === "ACTIVE"
                          ? `Room ${
                              tenant.room?.roomNumber ??
                              rooms.find((r) => r.id === Number(tenant.roomId))?.roomNumber ??
                              "-"
                            }`
                          : "Unassigned"}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[#858b84] dark:text-gray-400 block">Billing Date:</span>
                      <span className="font-medium text-[#202522] dark:text-gray-100">{formatDate(tenant.billingDate)}</span>
                    </div>
                  </div>

                  {/* Actions Toolbar for Mobile */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <button
                      onClick={() => openViewTenant(tenant)}
                      className="inline-flex flex-1 justify-center items-center gap-1 rounded-md border border-[#cbc7bc] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#202522] hover:border-[#202522] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-gray-200 dark:hover:border-white/30 dark:hover:bg-white/5"
                    >
                      <EyeIcon size={14} /> View
                    </button>
                    <button
                      onClick={() => openEditTenant(tenant)}
                      className="inline-flex flex-1 justify-center items-center gap-1 rounded-md border border-[#cbc7bc] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#202522] hover:border-[#202522] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-gray-200 dark:hover:border-white/30 dark:hover:bg-white/5"
                    >
                      <PencilSimpleIcon size={14} /> Edit
                    </button>
                    {tenant.status === "ACTIVE" && (
                      <button
                        onClick={() => openMoveOutModal(tenant)}
                        className="inline-flex flex-1 justify-center items-center gap-1 rounded-md border border-[#e1b8ae] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#9d4937] hover:border-[#9d4937] dark:border-[#e1684e]/30 dark:bg-[#1a1a1a] dark:text-[#e1684e] dark:hover:bg-[#e1684e]/10 dark:hover:border-[#e1684e]/60"
                      >
                        <ArrowSquareOutIcon size={14} /> Move out
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table Layout (>= md screen width) */}
            <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-[#dcd9d1] dark:divide-white/10 text-left">
              <thead className="bg-[#efede7] dark:bg-white/5 text-xs font-semibold uppercase tracking-[0.12em] text-[#707770] dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Billing Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e2da] dark:divide-white/10 text-sm text-[#202522] dark:text-gray-200">
                {sortedTenants.map((tenant) => (
                  <tr key={tenant.id} className="bg-[#f8f7f3] transition-colors hover:bg-[#f3f0e8]/50 dark:bg-[#1e1e1e] dark:hover:bg-white/5">
                    <td className="px-4 py-3.5 font-medium text-[#202522] dark:text-gray-100">{tenant.fullName}</td>
                    <td className="px-4 py-3.5 text-[#5b625b] dark:text-gray-300">{tenant.phone}</td>
                    <td className="px-4 py-3.5">
                      {tenant.status === "ACTIVE"
                        ? `Room ${
                            tenant.room?.roomNumber ??
                            rooms.find((r) => r.id === Number(tenant.roomId))?.roomNumber ??
                            "-"
                          }`
                        : "Unassigned"}
                    </td>
                    <td className="px-4 py-3.5 text-[#5b625b] dark:text-gray-300">{formatDate(tenant.billingDate)}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                          tenant.status === "ACTIVE"
                            ? "bg-[#dcecdf] text-[#397052] dark:bg-[#397052]/20 dark:text-[#55a278]"
                            : "bg-[#eee4d6] text-[#94613a] dark:bg-[#94613a]/20 dark:text-[#d39c71]"
                        }`}
                      >
                        {tenant.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openViewTenant(tenant)}
                          className="inline-flex items-center gap-1 rounded-md border border-[#cbc7bc] px-3 py-1.5 text-xs font-semibold text-[#202522] hover:border-[#202522] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-gray-200 dark:hover:border-white/30 dark:hover:bg-white/5"
                        >
                          <EyeIcon size={14} /> View
                        </button>
                        <button
                          onClick={() => openEditTenant(tenant)}
                          className="inline-flex items-center gap-1 rounded-md border border-[#cbc7bc] px-3 py-1.5 text-xs font-semibold text-[#202522] hover:border-[#202522] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-gray-200 dark:hover:border-white/30 dark:hover:bg-white/5"
                        >
                          <PencilSimpleIcon size={14} /> Edit
                        </button>
                        {tenant.status === "ACTIVE" && (
                          <button
                            onClick={() => openMoveOutModal(tenant)}
                            className="inline-flex items-center gap-1 rounded-md border border-[#e1b8ae] px-3 py-1.5 text-xs font-semibold text-[#9d4937] hover:border-[#9d4937] dark:border-[#e1684e]/30 dark:bg-[#1a1a1a] dark:text-[#e1684e] dark:hover:bg-[#e1684e]/10 dark:hover:border-[#e1684e]/60"
                          >
                            <ArrowSquareOutIcon size={14} /> Move out
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
        {loadingMore && (
          <div className="py-4 flex justify-center items-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#397052] border-t-transparent"></div>
          </div>
        )}
        <div ref={lastElementRef} className="h-2 w-full" />
      </section>

      <Modal
        isOpen={editingId !== null}
        onClose={closeEditor}
        title={editingId ? "Edit tenant" : "Add a tenant"}
        maxWidth="3xl"
        className="p-4 md:p-6"
      >
        <form onSubmit={saveTenant} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-[#202522] dark:text-gray-200">
              Full name
              <input
                required
                value={draft.fullName}
                onChange={(event) => updateDraft("fullName", event.target.value)}
                placeholder="e.g. Juan Dela Cruz"
                className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#397052] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white dark:focus:border-[#55a278]"
              />
            </label>
            <label className="text-sm font-medium text-[#202522] dark:text-gray-200">
              Contact number
              <input
                required
                type="tel"
                value={draft.phone}
                onChange={(event) => {
                  const val = event.target.value.replace(/[^0-9+\-\s()]/g, "");
                  updateDraft("phone", val);
                }}
                placeholder="e.g. 0912 345 6789"
                className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#397052] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white dark:focus:border-[#55a278]"
              />
            </label>
            <label className="text-sm font-medium text-[#202522] dark:text-gray-200">
              Date moved in
              <input
                required
                type="date"
                value={draft.moveInDate}
                onChange={(event) => updateDraft("moveInDate", event.target.value)}
                className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#397052] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white dark:focus:border-[#55a278]"
              />
            </label>
            <label className="text-sm font-medium text-[#202522] dark:text-gray-200">
              Date moved out
              <input
                type="date"
                value={draft.moveOutDate}
                onChange={(event) => updateDraft("moveOutDate", event.target.value)}
                className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#397052] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white dark:focus:border-[#55a278]"
              />
            </label>
            <label className="text-sm font-medium text-[#202522] dark:text-gray-200">
              Billing Date
              <input
                type="date"
                value={draft.billingDate}
                onChange={(event) => updateDraft("billingDate", event.target.value)}
                className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#397052] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white dark:focus:border-[#55a278]"
              />
            </label>
            <label className="text-sm font-medium text-[#202522] dark:text-gray-200">
              Status
              <select
                value={draft.status}
                onChange={(event) => {
                  const newStatus = event.target.value as Tenant["status"];
                  setDraft((current) => ({
                    ...current,
                    status: newStatus,
                  }));
                }}
                className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#397052] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white dark:focus:border-[#55a278] dark:[&>option]:bg-[#1a1a1a] dark:[&>option]:text-white"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </label>
            <label className="text-sm font-medium text-[#202522] dark:text-gray-200 md:col-span-2">
              Assigned room
              <select
                required
                value={draft.roomId}
                onChange={(event) => updateDraft("roomId", event.target.value)}
                className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#397052] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white dark:focus:border-[#55a278] dark:[&>option]:bg-[#1a1a1a] dark:[&>option]:text-white"
              >
                <option value="">Select a room</option>
                {selectableRooms.map((room) => {
                  const disabled =
                    unavailableRoomIds.has(room.id) && room.id !== Number(draft.roomId);
                  return (
                    <option key={room.id} value={room.id} disabled={disabled}>
                      Room {room.roomNumber} {disabled ? "(currently occupied)" : ""}
                    </option>
                  );
                })}
              </select>
              {selectableRooms.length === 0 && (
                <p className="mt-2 text-xs text-[#9d4937] dark:text-[#e1684e]">
                  No rooms are available for assignment right now.
                </p>
              )}
              {Boolean(currentEditingRoomId) && unavailableRoomIds.has(currentEditingRoomId) && (
                <p className="mt-2 text-xs text-[#707770] dark:text-gray-400">
                  Current room remains selectable for this tenant.
                </p>
              )}
            </label>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 md:flex-row md:justify-end">
            <button
              type="button"
              onClick={closeEditor}
              className="rounded-md px-4 py-2.5 text-sm font-semibold text-[#707770] hover:text-[#202522] dark:text-gray-400 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              disabled={saving}
              className="rounded-md bg-[#202522] dark:bg-white dark:text-[#121212] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 dark:disabled:bg-white/50"
            >
              {saving ? "Saving..." : editingId ? "Save changes" : "Create tenant"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!movingOutTenant}
        onClose={() => !processingMoveOut && setMovingOutTenant(null)}
        title={
          <div className="mb-2">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#397052] dark:text-[#55a278]">
              Resident Checkout
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[#202522] dark:text-gray-100">
              Move out {movingOutTenant?.fullName}?
            </h2>
          </div>
        }
        maxWidth="md"
        closeOnOutsideClick={!processingMoveOut}
        hideCloseButton={processingMoveOut}
        className="border-t-4 border-[#397052] dark:border-[#55a278]"
      >
        <div className="pt-2">
          <p className="text-sm leading-6 text-[#707770] dark:text-gray-400">
            This will change the tenant status to <strong>Inactive</strong> and free up the
            room assignment.
          </p>

          <div className="mt-4">
            <label className="block text-sm font-medium text-[#202522] dark:text-gray-200">
              Move-out Date
              <input
                type="date"
                required
                value={moveOutDate}
                onChange={(e) => setMoveOutDate(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2 text-sm outline-none focus:border-[#397052] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white dark:focus:border-[#55a278]"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={processingMoveOut}
              onClick={() => setMovingOutTenant(null)}
              className="rounded-md px-4 py-2.5 text-sm font-semibold text-[#707770] hover:text-[#202522] dark:text-gray-400 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={processingMoveOut}
              onClick={confirmMoveOut}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#9d4937] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#833c2d] disabled:opacity-50 dark:bg-[#e1684e] dark:hover:bg-[#d85033]"
            >
              <ArrowSquareOutIcon size={16} />{" "}
              {processingMoveOut ? "Processing..." : "Confirm move out"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!viewingTenant}
        onClose={() => setViewingTenant(null)}
        title="Tenant Details"
        maxWidth="3xl"
        className="p-5 sm:p-7"
      >
        {viewingTenant && (
          <div className="space-y-6 text-[#202522] dark:text-gray-200">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-[#707770] dark:text-gray-400">Name</p>
                <p className="text-lg font-medium dark:text-gray-100">{viewingTenant.fullName}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[#707770] dark:text-gray-400">Contact</p>
                <p className="text-lg font-medium dark:text-gray-100">{viewingTenant.phone}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[#707770] dark:text-gray-400">Room</p>
                <p className="text-lg font-medium dark:text-gray-100">
                  {viewingTenant.status === "ACTIVE"
                    ? `Room ${
                        viewingTenant.room?.roomNumber ??
                        rooms.find((r) => r.id === Number(viewingTenant.roomId))?.roomNumber ??
                        "-"
                      }`
                    : "Unassigned"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[#707770] dark:text-gray-400">Move-in Date</p>
                <p className="text-lg font-medium dark:text-gray-100">{formatDate(viewingTenant.moveInDate)}</p>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold uppercase tracking-wider text-[#397052] dark:text-[#55a278]">Invoice History</p>
                <button
                  onClick={() => {
                    setEditingBilling(null);
                    setIsEditorOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#397052] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#2e5942] dark:bg-[#4d8a68] dark:hover:bg-[#397052]"
                >
                  <PlusIcon weight="bold" /> Add Invoice
                </button>
              </div>
              {loadingBillings ? (
                <p className="text-sm text-[#707770] dark:text-gray-400">Loading invoices...</p>
              ) : tenantBillings.length === 0 ? (
                <div className="rounded-md border border-dashed border-[#cbc7bc] dark:border-white/10 p-6 text-center text-sm text-[#707770] dark:text-gray-400">
                  No invoices found for this tenant.
                </div>
              ) : (
                <div className="overflow-hidden rounded-md border border-[#dcd9d1] dark:border-white/10 bg-[#f8f7f3] dark:bg-[#1e1e1e]">
                  {/* Mobile Card Layout (< md screen width) */}
                  <div className="divide-y divide-[#dcd9d1] dark:divide-white/10 md:hidden">
                    {tenantBillings.map((bill) => (
                      <div key={bill.id} className="p-4 space-y-3 bg-[#f8f7f3] dark:bg-[#1e1e1e]">
                        <div className="flex justify-end">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide shrink-0 ${
                              bill.status === "PAID"
                                ? "bg-[#dcecdf] text-[#397052] dark:bg-[#397052]/20 dark:text-[#55a278]"
                                : bill.status === "OVERDUE"
                                ? "bg-[#fbeae5] text-[#9d4937] dark:bg-[#9d4937]/20 dark:text-[#e1684e]"
                                : "bg-[#eee4d6] text-[#94613a] dark:bg-[#94613a]/20 dark:text-[#d39c71]"
                            }`}
                          >
                            {bill.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 rounded-md border border-[#e5e2da] dark:border-white/10 bg-[#efede7]/60 dark:bg-white/5 p-2.5 text-xs">
                          <div>
                            <span className="text-[#858b84] dark:text-gray-400 block">Due Date:</span>
                            <span className="font-medium text-[#202522] dark:text-gray-100">{formatDate(bill.dueDate)}</span>
                            {bill.datePaid && (
                              <p className="text-[10px] text-[#397052] dark:text-[#55a278] mt-0.5">Paid: {formatDate(bill.datePaid)}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-[#858b84] dark:text-gray-400 block">Total Amount:</span>
                            <span className="text-sm font-bold text-[#202522] dark:text-gray-100">₱{bill.totalAmount.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Actions Toolbar for Mobile */}
                        <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1">
                          <button
                            onClick={() => setViewingBillingModal(bill)}
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
                              onClick={() => setSettlingBilling(bill)}
                              className="inline-flex items-center gap-1 rounded-md border border-[#b4d2be] bg-[#edf6f0] px-2.5 py-1.5 text-xs font-semibold text-[#397052] hover:border-[#397052] dark:border-[#55a278]/30 dark:bg-[#1a1a1a] dark:text-[#55a278] dark:hover:bg-[#397052]/10 dark:hover:border-[#55a278]/60"
                            >
                              <CheckCircleIcon size={14} /> Settle
                            </button>
                          )}

                          <button
                            onClick={() => { setEditingBilling(bill); setIsEditorOpen(true); }}
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

                  {/* Desktop Table Layout (>= md screen width) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#dcd9d1] dark:divide-white/10 text-left text-sm">
                    <thead className="bg-[#efede7] dark:bg-white/5 text-xs font-semibold uppercase text-[#707770] dark:text-gray-400">
                      <tr>
                        <th className="px-4 py-2">Billing Date</th>
                        <th className="px-4 py-2">Due Date</th>
                        <th className="px-4 py-2">Status</th>
                        <th className="px-4 py-2 text-right">Total Amount</th>
                        <th className="px-4 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5e2da] dark:divide-white/10 bg-white dark:bg-[#1e1e1e] text-[#202522] dark:text-gray-200">
                      {tenantBillings.map((bill) => (
                        <tr key={bill.id} className="hover:bg-[#f3f0e8]/50 dark:hover:bg-white/5 transition-colors">
                          <td className="px-4 py-2.5">{formatDate(bill.billingDate)}</td>
                          <td className="px-4 py-2.5">{formatDate(bill.dueDate)}</td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                bill.status === "PAID"
                                  ? "bg-[#dcecdf] text-[#397052] dark:bg-[#397052]/20 dark:text-[#55a278]"
                                  : bill.status === "OVERDUE"
                                  ? "bg-[#fbeae5] text-[#9d4937] dark:bg-[#9d4937]/20 dark:text-[#e1684e]"
                                  : "bg-[#eee4d6] text-[#94613a] dark:bg-[#94613a]/20 dark:text-[#d39c71]"
                              }`}
                            >
                              {bill.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-[#202522] dark:text-gray-100">
                            ₱{bill.totalAmount.toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex justify-end gap-1.5 sm:gap-2">
                              <button
                                onClick={() => setViewingBillingModal(bill)}
                                className="inline-flex items-center gap-1 rounded-md border border-[#cbc7bc] px-2.5 py-1.5 text-xs font-semibold text-[#202522] hover:border-[#202522] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-gray-200 dark:hover:border-white/30 dark:hover:bg-white/5"
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
                                  onClick={() => setSettlingBilling(bill)}
                                  className="inline-flex items-center gap-1 rounded-md border border-[#b4d2be] bg-[#edf6f0] px-2.5 py-1.5 text-xs font-semibold text-[#397052] hover:border-[#397052] dark:border-[#55a278]/30 dark:bg-[#1a1a1a] dark:text-[#55a278] dark:hover:bg-[#397052]/10 dark:hover:border-[#55a278]/60"
                                >
                                  <CheckCircleIcon size={14} /> Settle
                                </button>
                              )}

                              <button
                                onClick={() => { setEditingBilling(bill); setIsEditorOpen(true); }}
                                className="inline-flex items-center gap-1 rounded-md border border-[#cbc7bc] px-2.5 py-1.5 text-xs font-semibold text-[#202522] hover:border-[#202522] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-gray-200 dark:hover:border-white/30 dark:hover:bg-white/5"
                              >
                                <PencilSimpleIcon size={14} /> Edit
                              </button>
                              <button
                                onClick={() => setDeletingBilling(bill)}
                                className="inline-flex items-center gap-1 rounded-md border border-[#e1b8ae] px-2.5 py-1.5 text-xs font-semibold text-[#9d4937] hover:border-[#9d4937] dark:border-[#e1684e]/30 dark:bg-[#1a1a1a] dark:text-[#e1684e] dark:hover:bg-[#e1684e]/10 dark:hover:border-[#e1684e]/60"
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
                </div>
              )}
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setViewingTenant(null)}
                className="rounded-md border border-[#cbc7bc] px-4 py-2 text-sm font-semibold text-[#202522] hover:border-[#202522] dark:border-white/10 dark:text-gray-300 dark:hover:border-white/30 dark:hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Render the Reusable Billing Modals */}
      <ViewBillingModal
        billing={viewingBillingModal}
        onClose={() => setViewingBillingModal(null)}
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
        onSuccess={refreshTenantBillings}
        defaultTenantId={viewingTenant?.id.toString()}
      />

      <SettleBillingModal
        billing={settlingBilling}
        onClose={() => setSettlingBilling(null)}
        onSuccess={() => {
          refreshTenantBillings();
          setSettlingBilling(null);
        }}
      />

      <DeleteBillingModal
        billing={deletingBilling}
        onClose={() => setDeletingBilling(null)}
        onSuccess={() => {
          refreshTenantBillings();
          setDeletingBilling(null);
        }}
      />
    </div>
  );
}