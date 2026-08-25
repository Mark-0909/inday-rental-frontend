"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowSquareOutIcon,
  PencilSimpleIcon,
  PlusIcon,
  XIcon,
} from "@phosphor-icons/react";
import { endpoints } from "@/api/clients";
import { Room, Tenant } from "@/types";

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

  useEffect(() => {
    if (editingId === null && movingOutTenant === null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [editingId, movingOutTenant]);

  const loadData = () => {
    Promise.all([endpoints.tenants.getAll(), endpoints.rooms.getAll()])
      .then(([tenantResponse, roomResponse]) => {
        setTenants(tenantResponse.data);
        setRooms(roomResponse.data);
      })
      .catch(() => {
        setError("Could not load tenants. Check that the backend is running.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

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
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d96c52] md:mb-2 md:text-xs">
            Resident directory
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#202522]">Tenants</h1>
          <p className="mt-1.5 text-sm leading-6 text-[#707770] md:mt-2">
            Track residents, assigned rooms, and occupancy status.
          </p>
        </div>
        <button
          onClick={openNewTenant}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#d96c52] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#c55d45] md:w-fit"
        >
          <PlusIcon weight="bold" /> Add tenant
        </button>
      </div>

      {error && (
        <p role="alert" className="border-l-2 border-[#d96c52] bg-[#f8f7f3] px-4 py-3 text-sm text-[#9d4937]">
          {error}
        </p>
      )}

      <section className="overflow-hidden border border-[#dcd9d1] bg-[#f8f7f3]">
        {tenants.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#707770]">
            No tenants yet. Add your first tenant to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#dcd9d1] text-left">
              <thead className="bg-[#efede7] text-xs font-semibold uppercase tracking-[0.12em] text-[#707770]">
                <tr>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Billing Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e2da] text-sm text-[#202522]">
                {sortedTenants.map((tenant) => (
                  <tr key={tenant.id} className="bg-[#f8f7f3]">
                    <td className="px-4 py-3.5 font-medium">{tenant.fullName}</td>
                    <td className="px-4 py-3.5 text-[#5b625b]">{tenant.phone}</td>
                    <td className="px-4 py-3.5">
                      {tenant.status === "ACTIVE"
                        ? `Room ${
                            tenant.room?.roomNumber ??
                            rooms.find((r) => r.id === Number(tenant.roomId))?.roomNumber ??
                            "-"
                          }`
                        : "Unassigned"}
                    </td>
                    <td className="px-4 py-3.5 text-[#5b625b]">{formatDate(tenant.billingDate)}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                          tenant.status === "ACTIVE"
                            ? "bg-[#dcecdf] text-[#397052]"
                            : "bg-[#eee4d6] text-[#94613a]"
                        }`}
                      >
                        {tenant.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditTenant(tenant)}
                          className="inline-flex items-center gap-1 rounded-md border border-[#cbc7bc] px-3 py-1.5 text-xs font-semibold text-[#202522] hover:border-[#202522]"
                        >
                          <PencilSimpleIcon size={14} /> Edit
                        </button>
                        {tenant.status === "ACTIVE" && (
                          <button
                            onClick={() => openMoveOutModal(tenant)}
                            className="inline-flex items-center gap-1 rounded-md border border-[#e1b8ae] px-3 py-1.5 text-xs font-semibold text-[#9d4937] hover:border-[#9d4937]"
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
        )}
      </section>

      {editingId !== null && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex h-dvh w-screen items-end justify-center bg-[#202522]/60 p-0 md:items-center md:p-6"
              role="presentation"
              onClick={closeEditor}
            >
              <form
                onSubmit={saveTenant}
                role="dialog"
                aria-modal="true"
                aria-labelledby="tenant-editor-title"
                onClick={(event) => event.stopPropagation()}
                className="w-full max-w-3xl border-t-2 border-[#202522] bg-[#f8f7f3] p-4 shadow-2xl md:p-6"
              >
                <div className="mb-5 flex items-center justify-between gap-4">
                  <h2 id="tenant-editor-title" className="text-base font-semibold text-[#202522]">
                    {editingId ? "Edit tenant" : "Add a tenant"}
                  </h2>
                  <button
                    type="button"
                    onClick={closeEditor}
                    aria-label="Close tenant editor"
                    className="p-1 text-[#707770] hover:text-[#202522]"
                  >
                    <XIcon size={20} />
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-medium text-[#202522]">
                    Full name
                    <input
                      required
                      value={draft.fullName}
                      onChange={(event) => updateDraft("fullName", event.target.value)}
                      className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#d96c52]"
                    />
                  </label>
                  <label className="text-sm font-medium text-[#202522]">
                    Contact number
                    <input
                      required
                      value={draft.phone}
                      onChange={(event) => updateDraft("phone", event.target.value)}
                      className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#d96c52]"
                    />
                  </label>
                  <label className="text-sm font-medium text-[#202522]">
                    Date moved in
                    <input
                      required
                      type="date"
                      value={draft.moveInDate}
                      onChange={(event) => updateDraft("moveInDate", event.target.value)}
                      className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#d96c52]"
                    />
                  </label>
                  <label className="text-sm font-medium text-[#202522]">
                    Date moved out
                    <input
                      type="date"
                      value={draft.moveOutDate}
                      onChange={(event) => updateDraft("moveOutDate", event.target.value)}
                      className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#d96c52]"
                    />
                  </label>
                  <label className="text-sm font-medium text-[#202522]">
                    Billing Date
                    <input
                      type="date"
                      value={draft.billingDate}
                      onChange={(event) => updateDraft("billingDate", event.target.value)}
                      className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#d96c52]"
                    />
                  </label>
                  <label className="text-sm font-medium text-[#202522]">
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
                      className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#d96c52]"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-[#202522] md:col-span-2">
                    Assigned room
                    <select
                      required
                      value={draft.roomId}
                      onChange={(event) => updateDraft("roomId", event.target.value)}
                      className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#d96c52]"
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
                      <p className="mt-2 text-xs text-[#9d4937]">
                        No rooms are available for assignment right now.
                      </p>
                    )}
                    {Boolean(currentEditingRoomId) && unavailableRoomIds.has(currentEditingRoomId) && (
                      <p className="mt-2 text-xs text-[#707770]">
                        Current room remains selectable for this tenant.
                      </p>
                    )}
                  </label>
                </div>

                <div className="mt-5 flex flex-col-reverse gap-2 md:flex-row md:justify-end">
                  <button
                    type="button"
                    onClick={closeEditor}
                    className="rounded-md px-4 py-2.5 text-sm font-semibold text-[#707770] hover:text-[#202522]"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={saving}
                    className="rounded-md bg-[#202522] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? "Saving..." : editingId ? "Save changes" : "Create tenant"}
                  </button>
                </div>
              </form>
            </div>,
            document.body
          )
        : null}

      {movingOutTenant && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-[#202522]/60 p-4"
              role="presentation"
              onClick={() => !processingMoveOut && setMovingOutTenant(null)}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="moveout-tenant-title"
                onClick={(event) => event.stopPropagation()}
                className="w-full max-w-md border-t-2 border-[#d96c52] bg-[#f8f7f3] p-5 shadow-2xl sm:p-7"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#d96c52]">
                      Resident Checkout
                    </p>
                    <h2 id="moveout-tenant-title" className="mt-2 text-xl font-semibold text-[#202522]">
                      Move out {movingOutTenant.fullName}?
                    </h2>
                  </div>
                  <button
                    type="button"
                    disabled={processingMoveOut}
                    onClick={() => setMovingOutTenant(null)}
                    aria-label="Close move out confirmation"
                    className="p-1 text-[#707770] hover:text-[#202522] disabled:opacity-50"
                  >
                    <XIcon size={20} />
                  </button>
                </div>
                <p className="mt-4 text-sm leading-6 text-[#707770]">
                  This will change the tenant status to <strong>Inactive</strong> and free up the
                  room assignment.
                </p>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-[#202522]">
                    Move-out Date
                    <input
                      type="date"
                      required
                      value={moveOutDate}
                      onChange={(e) => setMoveOutDate(e.target.value)}
                      className="mt-1.5 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2 text-sm outline-none focus:border-[#d96c52]"
                    />
                  </label>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={processingMoveOut}
                    onClick={() => setMovingOutTenant(null)}
                    className="rounded-md px-4 py-2.5 text-sm font-semibold text-[#707770] hover:text-[#202522]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={processingMoveOut}
                    onClick={confirmMoveOut}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-[#9d4937] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#833c2d] disabled:opacity-50"
                  >
                    <ArrowSquareOutIcon size={16} />{" "}
                    {processingMoveOut ? "Processing..." : "Confirm move out"}
                  </button>
                </div>
              </section>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}