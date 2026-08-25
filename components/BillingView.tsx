"use client";

import React, { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircleIcon,
  EyeIcon,
  HouseIcon,
  PencilSimpleIcon,
  PlusIcon,
  PrinterIcon,
  ReceiptIcon,
  TrashIcon,
  UploadSimpleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { endpoints } from "@/api/clients";
import { Billing, Room, Tenant } from "@/types";
import { supabase } from "@/lib/supabase";

type BillingDraft = {
  tenantId: string;
  roomId: string;
  rentAmount: number;
  previousElectricityReading: number;
  currentElectricityReading: number;
  electricityRatePerKwh: number;
  waterBill: number;
  billingDate: string;
  dueDate: string;
  status: Billing["status"];
  datePaid: string;
};

type ReadingImageState = {
  url: string;
  file?: File;
  saved?: boolean;
};

const emptyDraft: BillingDraft = {
  tenantId: "",
  roomId: "",
  rentAmount: 0,
  previousElectricityReading: 0,
  currentElectricityReading: 0,
  electricityRatePerKwh: 12,
  waterBill: 0,
  billingDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
  status: "UNPAID",
  datePaid: "",
};

function dateInputValue(value: string | null | undefined) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

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

function getRoomPrice(room?: Room | null): number {
  if (!room) return 0;
  const roomRecord = room as unknown as Record<string, unknown>;
  return Number(roomRecord.monthlyRent ?? roomRecord.price ?? roomRecord.rentAmount ?? 0);
}

function draftFromBilling(billing: Billing): BillingDraft {
  return {
    tenantId: String(billing.tenant?.id ?? ""),
    roomId: String(billing.room?.id ?? ""),
    rentAmount: billing.rentAmount ?? 0,
    previousElectricityReading: billing.previousElectricityReading ?? 0,
    currentElectricityReading: billing.currentElectricityReading ?? 0,
    electricityRatePerKwh: billing.electricityRatePerKwh ?? 12,
    waterBill: billing.waterBill ?? 0,
    billingDate: dateInputValue(billing.billingDate),
    dueDate: dateInputValue(billing.dueDate),
    status: billing.status,
    datePaid: dateInputValue(billing.datePaid),
  };
}

export default function BillingPage() {
  const [billings, setBillings] = useState<Billing[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editor Modal
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<BillingDraft>(emptyDraft);
  const [readingImage, setReadingImage] = useState<ReadingImageState | null>(null);
  const [removedImageUrl, setRemovedImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Read-only Details Modal
  const [viewingBilling, setViewingBilling] = useState<Billing | null>(null);

  // Receipt Modal
  const [receiptBilling, setReceiptBilling] = useState<Billing | null>(null);

  // Quick Settle Modal
  const [settlingBilling, setSettlingBilling] = useState<Billing | null>(null);
  const [settleDate, setSettleDate] = useState<string>("");
  const [processingSettle, setProcessingSettle] = useState(false);

  // Delete Modal
  const [deletingBilling, setDeletingBilling] = useState<Billing | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const isModalOpen =
      editingId !== null ||
      settlingBilling !== null ||
      deletingBilling !== null ||
      viewingBilling !== null ||
      receiptBilling !== null;

    if (!isModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [editingId, settlingBilling, deletingBilling, viewingBilling, receiptBilling]);

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

  const activeTenants = useMemo(() => {
    return tenants.filter((t) => t.status === "ACTIVE");
  }, [tenants]);

  const calculatedElectricityBill = useMemo(() => {
    const usage = Math.max(0, draft.currentElectricityReading - draft.previousElectricityReading);
    return usage * (draft.electricityRatePerKwh || 0);
  }, [draft.currentElectricityReading, draft.previousElectricityReading, draft.electricityRatePerKwh]);

  const calculatedTotalAmount = useMemo(() => {
    return Number(draft.rentAmount || 0) + Number(draft.waterBill || 0) + calculatedElectricityBill;
  }, [draft.rentAmount, draft.waterBill, calculatedElectricityBill]);

  const closeEditor = () => {
    if (readingImage?.file) URL.revokeObjectURL(readingImage.url);
    setEditingId(null);
    setDraft(emptyDraft);
    setReadingImage(null);
    setRemovedImageUrl(null);
  };

  const updateDraft = <K extends keyof BillingDraft>(field: K, value: BillingDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handleTenantSelect = (tenantIdStr: string) => {
    const selectedTenant = tenants.find((t) => t.id === Number(tenantIdStr));
    if (!selectedTenant) {
      updateDraft("tenantId", tenantIdStr);
      return;
    }

    const assignedRoomId = selectedTenant.room?.id ?? selectedTenant.roomId;
    const assignedRoom = rooms.find((r) => r.id === Number(assignedRoomId));
    const roomRent = getRoomPrice(assignedRoom);

    setDraft((current) => ({
      ...current,
      tenantId: tenantIdStr,
      roomId: assignedRoomId ? String(assignedRoomId) : "",
      rentAmount: roomRent || current.rentAmount,
    }));
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setError("Only image files up to 5 MB can be uploaded.");
      return;
    }

    if (readingImage?.file) {
      URL.revokeObjectURL(readingImage.url);
    } else if (readingImage?.saved) {
      setRemovedImageUrl(readingImage.url);
    }

    setReadingImage({
      url: URL.createObjectURL(file),
      file,
      saved: false,
    });
    event.target.value = "";
  };

  const removeImage = () => {
    if (readingImage?.file) {
      URL.revokeObjectURL(readingImage.url);
    } else if (readingImage?.saved) {
      setRemovedImageUrl(readingImage.url);
    }
    setReadingImage(null);
  };

  const storagePathFor = (url: string) => {
    const marker = "/storage/v1/object/public/room-images/";
    const markerIndex = url.indexOf(marker);
    return markerIndex >= 0 ? decodeURIComponent(url.slice(markerIndex + marker.length)) : null;
  };

  const removeDeletedImage = async () => {
    if (!supabase || !removedImageUrl) return;
    const path = storagePathFor(removedImageUrl);
    if (!path) return;
    const { error: removeError } = await supabase.storage.from("room-images").remove([path]);
    if (removeError) throw new Error(`Invoice saved, but Supabase could not remove old meter photo: ${removeError.message}`);
  };

  const uploadReadingImage = async () => {
    if (!readingImage) return { url: "", path: null };
    if (!readingImage.file) return { url: readingImage.url, path: null };

    if (!supabase) throw new Error("Supabase storage is not configured.");

    const extension = readingImage.file.name.split(".").pop() || "jpg";
    const path = `readings/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("room-images")
      .upload(path, readingImage.file, { contentType: readingImage.file.type, upsert: false });

    if (uploadError) throw new Error(`Supabase photo upload failed: ${uploadError.message}`);

    const { data } = supabase.storage.from("room-images").getPublicUrl(path);
    return { url: data.publicUrl, path };
  };

  const openNewBilling = () => {
    setError(null);
    setDraft(emptyDraft);
    setReadingImage(null);
    setRemovedImageUrl(null);
    setEditingId(0);
  };

  const openEditBilling = (billing: Billing) => {
    setError(null);
    setEditingId(billing.id);
    setDraft(draftFromBilling(billing));
    setReadingImage(
      billing.electricityReadingImg ? { url: billing.electricityReadingImg, saved: true } : null
    );
    setRemovedImageUrl(null);
  };

  const openSettleModal = (billing: Billing) => {
    setError(null);
    setSettlingBilling(billing);
    setSettleDate(new Date().toISOString().slice(0, 10));
  };

  const saveBilling = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.tenantId || !draft.roomId) {
      setError("Please select a tenant and an assigned room.");
      return;
    }
    setSaving(true);
    setError(null);

    let newlyUploadedPath: string | null = null;

    uploadReadingImage()
      .then(({ url, path }) => {
        newlyUploadedPath = path;

        const payload = {
          tenantId: Number(draft.tenantId),
          roomId: Number(draft.roomId),
          rentAmount: Number(draft.rentAmount),
          electricityReadingImg: url,
          previousElectricityReading: Number(draft.previousElectricityReading),
          currentElectricityReading: Number(draft.currentElectricityReading),
          electricityRatePerKwh: Number(draft.electricityRatePerKwh),
          electricityBill: calculatedElectricityBill,
          waterBill: Number(draft.waterBill),
          totalAmount: calculatedTotalAmount,
          billingDate: draft.billingDate || null,
          dueDate: draft.dueDate || null,
          status: draft.status,
          datePaid: draft.status === "PAID" ? draft.datePaid || new Date().toISOString().slice(0, 10) : null,
        };

        const billingApi = endpoints.billing as {
          create: (data: Record<string, unknown>) => Promise<{ data: Billing }>;
          update?: (id: number, data: Record<string, unknown>) => Promise<{ data: Billing }>;
        };

        return editingId && billingApi.update
          ? billingApi.update(editingId, payload)
          : billingApi.create(payload);
      })
      .then(() => {
        loadData();
        closeEditor();
        return removeDeletedImage().catch((cleanupErr: unknown) => {
          const message = cleanupErr instanceof Error ? cleanupErr.message : "Saved, but old meter photo cleanup failed.";
          setError(message);
        });
      })
      .catch((saveErr: unknown) => {
        if (supabase && newlyUploadedPath) {
          void supabase.storage.from("room-images").remove([newlyUploadedPath]);
        }
        const typedError = saveErr as {
          message?: string;
          response?: { status?: number; data?: { message?: string } | string };
        };
        const responseMessage =
          typeof typedError.response?.data === "string"
            ? typedError.response.data
            : typedError.response?.data?.message;
        const status = typedError.response?.status ? ` (${typedError.response.status})` : "";
        setError(`${responseMessage ?? typedError.message ?? "Could not save billing record."}${status}`);
      })
      .finally(() => setSaving(false));
  };

  const confirmSettlement = async () => {
    if (!settlingBilling) return;
    setProcessingSettle(true);
    setError(null);

    const paymentDate = settleDate || new Date().toISOString().slice(0, 10);
    const payload = {
      tenantId: settlingBilling.tenant?.id,
      roomId: settlingBilling.room?.id,
      rentAmount: settlingBilling.rentAmount,
      electricityReadingImg: settlingBilling.electricityReadingImg,
      previousElectricityReading: settlingBilling.previousElectricityReading,
      currentElectricityReading: settlingBilling.currentElectricityReading,
      electricityRatePerKwh: settlingBilling.electricityRatePerKwh,
      electricityBill: settlingBilling.electricityBill,
      waterBill: settlingBilling.waterBill,
      totalAmount: settlingBilling.totalAmount,
      billingDate: settlingBilling.billingDate,
      dueDate: settlingBilling.dueDate,
      status: "PAID",
      datePaid: paymentDate,
    };

    try {
      const billingApi = endpoints.billing as {
        update?: (id: number, data: Record<string, unknown>) => Promise<{ data: Billing }>;
      };
      if (billingApi.update) {
        const response = await billingApi.update(settlingBilling.id, payload);
        if (response?.data) {
          setReceiptBilling(response.data);
        } else {
          setReceiptBilling({
            ...settlingBilling,
            status: "PAID",
            datePaid: paymentDate,
          });
        }
      }
      loadData();
      setSettlingBilling(null);
    } catch (settleErr: unknown) {
      const typedError = settleErr as {
        message?: string;
        response?: { status?: number; data?: { message?: string } | string };
      };
      const responseMessage =
        typeof typedError.response?.data === "string"
          ? typedError.response.data
          : typedError.response?.data?.message;
      const status = typedError.response?.status ? ` (${typedError.response.status})` : "";
      setError(`${responseMessage ?? typedError.message ?? "Could not settle billing."}${status}`);
    } finally {
      setProcessingSettle(false);
    }
  };

  const deleteBilling = () => {
    if (!deletingBilling) return;
    setDeleting(true);
    setError(null);

    const billingApi = endpoints.billing as {
      remove?: (id: number) => Promise<unknown>;
    };

    if (!billingApi.remove) {
      setError("Delete endpoint not configured.");
      setDeleting(false);
      return;
    }

    billingApi
      .remove(deletingBilling.id)
      .then(async () => {
        setBillings((current) => current.filter((b) => b.id !== deletingBilling.id));
        setDeletingBilling(null);

        if (supabase && deletingBilling.electricityReadingImg) {
          const path = storagePathFor(deletingBilling.electricityReadingImg);
          if (path) {
            await supabase.storage.from("room-images").remove([path]);
          }
        }
      })
      .catch((deleteErr: unknown) => {
        const typedError = deleteErr as {
          message?: string;
          response?: { status?: number; data?: { message?: string } | string };
        };
        const responseMessage =
          typeof typedError.response?.data === "string"
            ? typedError.response.data
            : typedError.response?.data?.message;
        const status = typedError.response?.status ? ` (${typedError.response.status})` : "";
        setError(`${responseMessage ?? typedError.message ?? "Could not delete invoice."}${status}`);
      })
      .finally(() => setDeleting(false));
  };

  const sortedBillings = useMemo(() => {
    return [...billings].sort((a, b) => {
      if (a.status === b.status) return new Date(b.billingDate).getTime() - new Date(a.billingDate).getTime();
      if (a.status === "UNPAID" || a.status === "OVERDUE") return -1;
      return 1;
    });
  }, [billings]);

  if (loading) return <p className="text-sm text-[#707770]">Loading billing ledger...</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
      {/* Precision Print Engine with Strict Top-Left Corner Anchor */}
      <style jsx global>{`
        @page {
          margin: 0;
          size: auto;
        }

        @media print {
          *,
          *::before,
          *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          html,
          body {
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
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d96c52] md:mb-2 md:text-xs">
            Financial ledger
          </p>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#202522]">Billing & Invoices</h1>
          <p className="mt-1.5 text-sm leading-6 text-[#707770] md:mt-2">
            Track monthly billing statements, issue invoices, and print receipts.
          </p>
        </div>
        <button
          onClick={openNewBilling}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#d96c52] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#c55d45] md:w-fit"
        >
          <PlusIcon weight="bold" /> Create Invoice
        </button>
      </div>

      {error && (
        <p role="alert" className="border-l-2 border-[#d96c52] bg-[#f8f7f3] px-4 py-3 text-sm text-[#9d4937]">
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
                    <th className="px-5 py-3 whitespace-nowrap">Tenant & Room</th>
                    <th className="px-5 py-3 whitespace-nowrap">Due Date</th>
                    <th className="px-5 py-3 whitespace-nowrap">Total Amount</th>
                    <th className="px-5 py-3 whitespace-nowrap">Status</th>
                    <th className="px-5 py-3 whitespace-nowrap text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e2da] text-sm text-[#202522]">
                  {sortedBillings.map((bill) => (
                    <tr key={bill.id} className="bg-[#f8f7f3] transition-colors hover:bg-[#f3f0e8]/50">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <p className="font-semibold text-[#202522]">{bill.tenant?.fullName ?? "Unknown Tenant"}</p>
                        <p className="text-xs text-[#707770]">Room {bill.room?.roomNumber ?? "-"}</p>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-[#5b625b]">
                        <p>{formatDate(bill.dueDate)}</p>
                        {bill.datePaid && <p className="text-[11px] text-[#397052]">Paid: {formatDate(bill.datePaid)}</p>}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap font-bold text-[#202522]">{formatCurrency(bill.totalAmount)}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
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
                      <td className="px-5 py-3.5 whitespace-nowrap">
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

      {/* Read-Only Details Modal */}
      {viewingBilling && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-[#202522]/60 p-4"
              role="presentation"
              onClick={() => setViewingBilling(null)}
            >
              <section
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
                className="max-h-[92vh] w-full max-w-lg overflow-y-auto border-t-2 border-[#202522] bg-[#f8f7f3] p-5 shadow-2xl sm:p-7"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        viewingBilling.status === "PAID"
                          ? "bg-[#dcecdf] text-[#397052]"
                          : viewingBilling.status === "OVERDUE"
                          ? "bg-[#fbeae5] text-[#9d4937]"
                          : "bg-[#eee4d6] text-[#94613a]"
                      }`}
                    >
                      {viewingBilling.status}
                    </span>
                    <h2 className="mt-2 text-xl font-semibold text-[#202522]">
                      {viewingBilling.tenant?.fullName}
                    </h2>
                    <p className="text-xs text-[#707770]">Room {viewingBilling.room?.roomNumber ?? "-"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewingBilling(null)}
                    className="p-1 text-[#707770] hover:text-[#202522]"
                  >
                    <XIcon size={20} />
                  </button>
                </div>

                <div className="mt-5 space-y-4 text-sm">
                  <div className="rounded-md border border-[#dcd9d1] bg-white p-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#707770]">Statement Summary</p>
                    <div className="space-y-1.5 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#707770]">Billing Date</span>
                        <span className="font-medium text-[#202522]">{formatDate(viewingBilling.billingDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#707770]">Due Date</span>
                        <span className="font-medium text-[#202522]">{formatDate(viewingBilling.dueDate)}</span>
                      </div>
                      {viewingBilling.datePaid && (
                        <div className="flex justify-between">
                          <span className="text-[#707770]">Date Paid</span>
                          <span className="font-medium text-[#397052]">{formatDate(viewingBilling.datePaid)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fully Transparent Breakdown Section */}
                  <div className="rounded-md border border-[#dcd9d1] bg-white p-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#707770]">Itemized Cost Matrix</p>
                    <div className="space-y-2.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#707770]">Monthly Base Rent</span>
                        <span className="font-medium">{formatCurrency(viewingBilling.rentAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-[#707770]">Water Dues (Fixed/Metered)</span>
                        <span className="font-medium">{formatCurrency(viewingBilling.waterBill)}</span>
                      </div>

                      {/* Explicit Detailed Electricity Matrix */}
                      <div className="rounded-md border border-[#eee4d6] bg-[#fcfbf9] p-3 text-xs space-y-1.5">
                        <div className="flex justify-between font-semibold text-[#202522]">
                          <span>Electricity Subtotal:</span>
                          <span>{formatCurrency(viewingBilling.electricityBill)}</span>
                        </div>
                        <div className="flex justify-between text-[#707770]">
                          <span>Current Reading:</span>
                          <span className="font-mono">{viewingBilling.currentElectricityReading} kWh</span>
                        </div>
                        <div className="flex justify-between text-[#707770]">
                          <span>Previous Reading:</span>
                          <span className="font-mono">{viewingBilling.previousElectricityReading} kWh</span>
                        </div>
                        <div className="flex justify-between border-t border-[#eee4d6] pt-1 text-[#202522]">
                          <span>Consumed Electricity:</span>
                          <span className="font-semibold">
                            {Math.max(
                              0,
                              viewingBilling.currentElectricityReading - viewingBilling.previousElectricityReading
                            )}{" "}
                            kWh
                          </span>
                        </div>
                        <div className="flex justify-between text-[#707770]">
                          <span>Rate per kWh:</span>
                          <span>₱{viewingBilling.electricityRatePerKwh}/kWh</span>
                        </div>
                        <div className="text-[11px] text-[#94613a] italic pt-0.5">
                          Formula: {Math.max(0, viewingBilling.currentElectricityReading - viewingBilling.previousElectricityReading)} kWh × ₱{viewingBilling.electricityRatePerKwh} = {formatCurrency(viewingBilling.electricityBill)}
                        </div>
                      </div>

                      <div className="flex justify-between border-t border-[#dcd9d1] pt-2.5 text-base font-bold text-[#202522]">
                        <span>Total Due</span>
                        <span>{formatCurrency(viewingBilling.totalAmount)}</span>
                      </div>
                    </div>
                  </div>

                  {viewingBilling.electricityReadingImg && (
                    <div className="rounded-md border border-[#dcd9d1] bg-white p-4">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#707770]">
                        Meter Reading Proof
                      </p>
                      <a
                        href={viewingBilling.electricityReadingImg}
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden rounded border border-[#dcd9d1]"
                      >
                        <img
                          src={viewingBilling.electricityReadingImg}
                          alt="Meter Proof"
                          className="h-44 w-full object-cover"
                        />
                      </a>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  {viewingBilling.status === "PAID" && (
                    <button
                      type="button"
                      onClick={() => {
                        const bill = viewingBilling;
                        setViewingBilling(null);
                        setReceiptBilling(bill);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md bg-[#397052] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2e5942]"
                    >
                      <ReceiptIcon size={16} /> View Receipt
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setViewingBilling(null)}
                    className="rounded-md border border-[#cbc7bc] px-4 py-2 text-sm font-semibold text-[#202522] hover:border-[#202522]"
                  >
                    Close
                  </button>
                </div>
              </section>
            </div>,
            document.body
          )
        : null}

      {/* Styled 80mm Top-Left Docked Receipt Modal */}
      {receiptBilling && typeof document !== "undefined"
        ? createPortal(
            <div
              id="printable-receipt-modal"
              className="fixed inset-0 z-50 flex items-center justify-center bg-[#202522]/60 p-4"
              role="presentation"
              onClick={() => setReceiptBilling(null)}
            >
              <section
                id="printable-receipt-container"
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
                className="relative max-h-[95vh] w-full max-w-85 overflow-hidden rounded-md border-t-4 border-[#397052] bg-white p-5 text-[#202522] shadow-2xl"
              >
                {/* Contained House Watermark */}
                <div
                  id="receipt-watermark-bg"
                  className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.08]"
                  aria-hidden="true"
                >
                  <HouseIcon size={190} weight="fill" className="text-[#397052]" />
                </div>

                {/* Receipt Thermal Content */}
                <div className="relative z-10 space-y-3 font-mono text-[11px] leading-tight text-[#202522]">
                  <div className="text-center">
                    <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#dcecdf] text-[#397052]">
                      <HouseIcon size={14} weight="fill" />
                    </div>
                    <h2 className="text-xs font-bold tracking-wider uppercase text-[#202522]">Inday Rental Properties</h2>
                    <p className="text-[10px] text-[#707770]">Official Payment Voucher</p>
                    <div className="mt-1.5 inline-block rounded-full border border-[#b4d2be] bg-[#dcecdf] px-2.5 py-0.5 text-[9px] font-bold tracking-wider uppercase text-[#397052]">
                      PAID IN FULL
                    </div>
                  </div>

                  <div className="border-y border-dashed border-[#cbc7bc] py-2 space-y-1 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-[#707770]">REC NO:</span>
                      <span className="font-semibold text-[#202522]">REC-{receiptBilling.id.toString().padStart(6, "0")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#707770]">DATE PAID:</span>
                      <span className="text-[#202522]">{formatDate(receiptBilling.datePaid)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#707770]">TENANT:</span>
                      <span className="font-semibold text-[#202522]">{receiptBilling.tenant?.fullName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#707770]">ASSIGNED:</span>
                      <span className="text-[#202522]">Room {receiptBilling.room?.roomNumber ?? "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#707770]">PERIOD:</span>
                      <span className="text-[#202522]">{formatDate(receiptBilling.billingDate)}</span>
                    </div>
                  </div>

                  {/* Fully Itemized Transparent Charges */}
                  <div className="space-y-1.5 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-[#5b625b]">Monthly Rent:</span>
                      <span className="font-medium text-[#202522]">{formatCurrency(receiptBilling.rentAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#5b625b]">Water Bill:</span>
                      <span className="font-medium text-[#202522]">{formatCurrency(receiptBilling.waterBill)}</span>
                    </div>

                    {/* Transparent Electricity Reading Breakdown on Printed Receipt */}
                    <div className="border-t border-dotted border-[#cbc7bc] pt-1 space-y-0.5">
                      <div className="flex justify-between">
                        <span className="font-semibold text-[#202522]">Electricity:</span>
                        <span className="font-semibold text-[#202522]">{formatCurrency(receiptBilling.electricityBill)}</span>
                      </div>
                      <div className="flex justify-between text-[9px] text-[#707770]">
                        <span>- Curr Reading:</span>
                        <span>{receiptBilling.currentElectricityReading} kWh</span>
                      </div>
                      <div className="flex justify-between text-[9px] text-[#707770]">
                        <span>- Prev Reading:</span>
                        <span>{receiptBilling.previousElectricityReading} kWh</span>
                      </div>
                      <div className="flex justify-between text-[9px] text-[#707770]">
                        <span>- Consumed Usage:</span>
                        <span>{Math.max(0, receiptBilling.currentElectricityReading - receiptBilling.previousElectricityReading)} kWh</span>
                      </div>
                      <div className="flex justify-between text-[9px] text-[#707770]">
                        <span>- Unit Rate:</span>
                        <span>₱{receiptBilling.electricityRatePerKwh}/kWh</span>
                      </div>
                    </div>

                    <div className="border-t border-[#202522] pt-2 flex justify-between font-bold text-xs">
                      <span className="text-[#202522]">TOTAL PAID:</span>
                      <span className="text-[#397052]">{formatCurrency(receiptBilling.totalAmount)}</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-[#cbc7bc] pt-2 text-center text-[9px] text-[#707770]">
                    <p>Thank you for your prompt payment!</p>
                    <p>Please retain this receipt for your records.</p>
                  </div>
                </div>

                <div className="no-print relative z-10 mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setReceiptBilling(null)}
                    className="rounded-md border border-[#cbc7bc] px-3 py-1.5 text-xs font-semibold text-[#707770] hover:text-[#202522]"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#397052] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2e5942]"
                  >
                    <PrinterIcon size={14} /> Print Receipt
                  </button>
                </div>
              </section>
            </div>,
            document.body
          )
        : null}

      {/* Editor Modal Form */}
      {editingId !== null && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex h-dvh w-screen items-end justify-center bg-[#202522]/60 p-0 md:items-center md:p-6"
              role="presentation"
              onClick={closeEditor}
            >
              <form
                onSubmit={saveBilling}
                role="dialog"
                aria-modal="true"
                aria-labelledby="billing-editor-title"
                onClick={(e) => e.stopPropagation()}
                className="max-h-[92vh] w-full max-w-4xl overflow-y-auto border-t-2 border-[#202522] bg-[#f8f7f3] p-4 shadow-2xl md:p-6"
              >
                <div className="mb-5 flex items-center justify-between gap-4">
                  <h2 id="billing-editor-title" className="text-base font-semibold text-[#202522]">
                    {editingId ? "Edit Invoice" : "Create Invoice"}
                  </h2>
                  <button type="button" onClick={closeEditor} className="p-1 text-[#707770] hover:text-[#202522]">
                    <XIcon size={20} />
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-medium text-[#202522]">
                    Resident
                    <select
                      required
                      value={draft.tenantId}
                      onChange={(e) => handleTenantSelect(e.target.value)}
                      className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#d96c52]"
                    >
                      <option value="">Select an active resident</option>
                      {activeTenants.map((tenant) => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.fullName} (Room {tenant.room?.roomNumber ?? "-"})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm font-medium text-[#202522]">
                    Room
                    <select
                      required
                      value={draft.roomId}
                      onChange={(e) => updateDraft("roomId", e.target.value)}
                      className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#d96c52]"
                    >
                      <option value="">Select Room</option>
                      {rooms.map((room) => (
                        <option key={room.id} value={room.id}>
                          Room {room.roomNumber} - {formatCurrency(getRoomPrice(room))}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm font-medium text-[#202522]">
                    Base Rent (₱)
                    <input
                      type="number"
                      required
                      min="0"
                      value={draft.rentAmount}
                      onChange={(e) => updateDraft("rentAmount", Number(e.target.value))}
                      className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#d96c52]"
                    />
                  </label>

                  <label className="text-sm font-medium text-[#202522]">
                    Water Bill (₱)
                    <input
                      type="number"
                      required
                      min="0"
                      value={draft.waterBill}
                      onChange={(e) => updateDraft("waterBill", Number(e.target.value))}
                      className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#d96c52]"
                    />
                  </label>
                </div>

                {/* Electricity Matrix */}
                <div className="mt-4 rounded-md border border-[#dcd9d1] bg-[#f0ede6] p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#707770]">Electricity Computation</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <label className="text-xs font-medium text-[#202522]">
                      Previous Reading (kWh)
                      <input
                        type="number"
                        min="0"
                        value={draft.previousElectricityReading}
                        onChange={(e) => updateDraft("previousElectricityReading", Number(e.target.value))}
                        className="mt-1 w-full rounded-md border border-[#dcd9d1] bg-white px-2.5 py-1.5 text-sm font-normal outline-none focus:border-[#d96c52]"
                      />
                    </label>

                    <label className="text-xs font-medium text-[#202522]">
                      Current Reading (kWh)
                      <input
                        type="number"
                        min="0"
                        value={draft.currentElectricityReading}
                        onChange={(e) => updateDraft("currentElectricityReading", Number(e.target.value))}
                        className="mt-1 w-full rounded-md border border-[#dcd9d1] bg-white px-2.5 py-1.5 text-sm font-normal outline-none focus:border-[#d96c52]"
                      />
                    </label>

                    <label className="text-xs font-medium text-[#202522]">
                      Rate per kWh (₱)
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={draft.electricityRatePerKwh}
                        onChange={(e) => updateDraft("electricityRatePerKwh", Number(e.target.value))}
                        className="mt-1 w-full rounded-md border border-[#dcd9d1] bg-white px-2.5 py-1.5 text-sm font-normal outline-none focus:border-[#d96c52]"
                      />
                    </label>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-[#dcd9d1] pt-3 text-xs">
                    <span className="text-[#707770]">
                      Consumed Usage:{" "}
                      <strong>
                        {Math.max(0, draft.currentElectricityReading - draft.previousElectricityReading)} kWh
                      </strong>
                    </span>
                    <span className="font-semibold text-[#202522]">
                      Subtotal: {formatCurrency(calculatedElectricityBill)}
                    </span>
                  </div>
                </div>

                {/* Meter Photo Upload */}
                <div className="mt-4 text-sm font-medium text-[#202522]">
                  <span>Meter Reading Proof (Supabase Storage)</span>
                  {!readingImage ? (
                    <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 border border-dashed border-[#cbc7bc] bg-white px-4 py-5 text-sm font-semibold text-[#707770] transition-colors hover:border-[#d96c52] hover:text-[#d96c52]">
                      <UploadSimpleIcon size={20} />
                      <span>Upload meter photo</span>
                      <input type="file" accept="image/*" onChange={handleImageChange} className="sr-only" />
                    </label>
                  ) : (
                    <div className="mt-2 flex items-center gap-3 rounded-md border border-[#dcd9d1] bg-white p-2">
                      <div className="relative h-16 w-16 overflow-hidden rounded bg-[#dedbd2]">
                        <img src={readingImage.url} alt="Meter reading" className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1 truncate">
                        <p className="truncate text-xs font-semibold text-[#202522]">
                          {readingImage.saved ? "Saved photo" : readingImage.file?.name ?? "New photo"}
                        </p>
                        <p className="text-[11px] text-[#858b84]">Ready for upload</p>
                      </div>
                      <button
                        type="button"
                        onClick={removeImage}
                        className="rounded p-1 text-[#707770] hover:bg-[#f8f7f3] hover:text-[#9d4937]"
                      >
                        <XIcon size={18} />
                      </button>
                    </div>
                  )}
                  <p className="mt-1 text-xs font-normal text-[#858b84]">JPG, PNG, or WEBP · up to 5 MB</p>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <label className="text-sm font-medium text-[#202522]">
                    Status
                    <select
                      value={draft.status}
                      onChange={(e) => updateDraft("status", e.target.value as Billing["status"])}
                      className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#d96c52]"
                    >
                      <option value="UNPAID">Unpaid</option>
                      <option value="PAID">Paid</option>
                      <option value="OVERDUE">Overdue</option>
                    </select>
                  </label>

                  <label className="text-sm font-medium text-[#202522]">
                    Billing Date
                    <input
                      type="date"
                      required
                      value={draft.billingDate}
                      onChange={(e) => updateDraft("billingDate", e.target.value)}
                      className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#d96c52]"
                    />
                  </label>

                  <label className="text-sm font-medium text-[#202522]">
                    Due Date
                    <input
                      type="date"
                      required
                      value={draft.dueDate}
                      onChange={(e) => updateDraft("dueDate", e.target.value)}
                      className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#d96c52]"
                    />
                  </label>
                </div>

                {/* Total Computed Summary */}
                <div className="mt-6 flex items-center justify-between rounded-md bg-[#202522] p-4 text-white">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[#cbc7bc]">Total Amount Due</p>
                    <p className="text-xs text-[#a0a6a0]">Rent + Water + Electricity</p>
                  </div>
                  <p className="text-xl font-bold">{formatCurrency(calculatedTotalAmount)}</p>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-2 md:flex-row md:justify-end">
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
                    {saving ? "Saving..." : editingId ? "Save Changes" : "Issue Invoice"}
                  </button>
                </div>
              </form>
            </div>,
            document.body
          )
        : null}

      {/* Quick Settlement Modal */}
      {settlingBilling && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-[#202522]/60 p-4"
              role="presentation"
              onClick={() => !processingSettle && setSettlingBilling(null)}
            >
              <section
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md border-t-2 border-[#397052] bg-[#f8f7f3] p-5 shadow-2xl sm:p-7"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#397052]">Payment Processing</p>
                    <h2 className="mt-2 text-xl font-semibold text-[#202522]">
                      Settle {formatCurrency(settlingBilling.totalAmount)}?
                    </h2>
                  </div>
                  <button
                    type="button"
                    disabled={processingSettle}
                    onClick={() => setSettlingBilling(null)}
                    className="p-1 text-[#707770] hover:text-[#202522]"
                  >
                    <XIcon size={20} />
                  </button>
                </div>

                <p className="mt-4 text-sm leading-6 text-[#707770]">
                  Record settlement for <strong>{settlingBilling.tenant?.fullName}</strong>.
                </p>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-[#202522]">
                    Payment Date
                    <input
                      type="date"
                      required
                      value={settleDate}
                      onChange={(e) => setSettleDate(e.target.value)}
                      className="mt-1.5 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2 text-sm outline-none focus:border-[#397052]"
                    />
                  </label>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={processingSettle}
                    onClick={() => setSettlingBilling(null)}
                    className="rounded-md px-4 py-2.5 text-sm font-semibold text-[#707770] hover:text-[#202522]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={processingSettle}
                    onClick={confirmSettlement}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-[#397052] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2e5942] disabled:opacity-50"
                  >
                    <CheckCircleIcon size={16} />
                    {processingSettle ? "Recording..." : "Confirm & Generate Receipt"}
                  </button>
                </div>
              </section>
            </div>,
            document.body
          )
        : null}

      {/* Delete Confirmation Modal */}
      {deletingBilling && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-[#202522]/60 p-4"
              role="presentation"
              onClick={() => !deleting && setDeletingBilling(null)}
            >
              <section
                role="alertdialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md border-t-2 border-[#d96c52] bg-[#f8f7f3] p-5 shadow-2xl sm:p-7"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#d96c52]">Permanent action</p>
                    <h2 className="mt-2 text-xl font-semibold text-[#202522]">Delete Invoice #{deletingBilling.id}?</h2>
                  </div>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setDeletingBilling(null)}
                    className="p-1 text-[#707770] hover:text-[#202522] disabled:opacity-50"
                  >
                    <XIcon size={20} />
                  </button>
                </div>
                <p className="mt-4 text-sm leading-6 text-[#707770]">
                  This removes the invoice record from Aiven and deletes its linked meter photo from Supabase Storage.
                </p>
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setDeletingBilling(null)}
                    className="rounded-md px-4 py-2.5 text-sm font-semibold text-[#707770] hover:text-[#202522]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={deleteBilling}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-[#9d4937] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <TrashIcon /> {deleting ? "Deleting..." : "Delete Invoice"}
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