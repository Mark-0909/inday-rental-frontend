import React, { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import { Billing, Room, Tenant } from "@/types";
import { endpoints } from "@/api/clients";
import { supabase } from "@/lib/supabase";
import { UploadSimpleIcon, XIcon } from "@phosphor-icons/react";

type BillingDraft = {
  tenantId: string;
  roomId: string;
  rentAmount: number | "";
  previousElectricityReading: number | "";
  currentElectricityReading: number | "";
  electricityRatePerKwh: number | "";
  waterBill: number | "";
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
  rentAmount: "",
  previousElectricityReading: "",
  currentElectricityReading: "",
  electricityRatePerKwh: 12,
  waterBill: "",
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

function getRoomPrice(room?: Room | null): number {
  if (!room) return 0;
  const roomRecord = room as unknown as Record<string, unknown>;
  return Number(roomRecord.monthlyRent ?? roomRecord.price ?? roomRecord.rentAmount ?? 0);
}

function draftFromBilling(billing: Billing): BillingDraft {
  return {
    tenantId: String(billing.tenant?.id ?? ""),
    roomId: String(billing.room?.id ?? ""),
    rentAmount: billing.rentAmount ?? "",
    previousElectricityReading: billing.previousElectricityReading ?? "",
    currentElectricityReading: billing.currentElectricityReading ?? "",
    electricityRatePerKwh: billing.electricityRatePerKwh ?? 12,
    waterBill: billing.waterBill ?? "",
    billingDate: dateInputValue(billing.billingDate),
    dueDate: dateInputValue(billing.dueDate),
    status: billing.status,
    datePaid: dateInputValue(billing.datePaid),
  };
}

interface EditBillingModalProps {
  isOpen: boolean;
  billing: Billing | null; // null means create
  tenants: Tenant[];
  rooms: Room[];
  onClose: () => void;
  onSuccess: () => void;
  defaultTenantId?: string;
}

export default function EditBillingModal({
  isOpen,
  billing,
  tenants,
  rooms,
  onClose,
  onSuccess,
  defaultTenantId,
}: EditBillingModalProps) {
  const [draft, setDraft] = useState<BillingDraft>(emptyDraft);
  const [readingImage, setReadingImage] = useState<ReadingImageState | null>(null);
  const [removedImageUrl, setRemovedImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (billing) {
        setDraft(draftFromBilling(billing));
        setReadingImage(
          billing.electricityReadingImg ? { url: billing.electricityReadingImg, saved: true } : null
        );
      } else {
        const initialDraft = { ...emptyDraft };
        
        if (defaultTenantId) {
          initialDraft.tenantId = defaultTenantId;
          const tenant = tenants.find(t => t.id === Number(defaultTenantId));
          if (tenant) {
            const assignedRoomId = tenant.room?.id ?? tenant.roomId;
            const assignedRoom = rooms.find((r) => r.id === Number(assignedRoomId));
            initialDraft.roomId = assignedRoomId ? String(assignedRoomId) : "";
            initialDraft.rentAmount = getRoomPrice(assignedRoom);
          }
        }
        
        setDraft(initialDraft);
        setReadingImage(null);
      }
      setRemovedImageUrl(null);
      setError(null);
    }
  }, [isOpen, billing]);

  const activeTenants = useMemo(() => {
    return tenants.filter((t) => t.status === "ACTIVE");
  }, [tenants]);

  const calculatedElectricityBill = useMemo(() => {
    const currentReading = Number(draft.currentElectricityReading) || 0;
    const previousReading = Number(draft.previousElectricityReading) || 0;
    const rate = Number(draft.electricityRatePerKwh) || 0;
    const usage = Math.max(0, currentReading - previousReading);
    return usage * rate;
  }, [draft.currentElectricityReading, draft.previousElectricityReading, draft.electricityRatePerKwh]);

  const calculatedTotalAmount = useMemo(() => {
    return Number(draft.rentAmount || 0) + Number(draft.waterBill || 0) + calculatedElectricityBill;
  }, [draft.rentAmount, draft.waterBill, calculatedElectricityBill]);

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

  const handleClose = () => {
    if (readingImage?.file) URL.revokeObjectURL(readingImage.url);
    onClose();
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

        return billing && billingApi.update
          ? billingApi.update(billing.id, payload)
          : billingApi.create(payload);
      })
      .then(() => {
        onSuccess();
        handleClose();
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={billing ? "Edit Invoice" : "Create Invoice"}
      maxWidth="4xl"
      className="p-4 md:p-6"
    >
      <form onSubmit={saveBilling} className="space-y-5">
        {error && (
          <p className="mt-3 text-sm text-[#9d4937] bg-[#f8e1e1] p-3 rounded-md border border-[#e1b8ae]">
            {error}
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-[#202522]">
            Resident
            <select
              required
              value={draft.tenantId}
              onChange={(e) => handleTenantSelect(e.target.value)}
              className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#397052]"
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
              className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#397052]"
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
              onChange={(e) => updateDraft("rentAmount", e.target.value === "" ? "" : Number(e.target.value))}
              className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#397052]"
            />
          </label>

          <label className="text-sm font-medium text-[#202522]">
            Water Bill (₱)
            <input
              type="number"
              required
              min="0"
              value={draft.waterBill}
              onChange={(e) => updateDraft("waterBill", e.target.value === "" ? "" : Number(e.target.value))}
              className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#397052]"
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
                onChange={(e) => updateDraft("previousElectricityReading", e.target.value === "" ? "" : Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-[#dcd9d1] bg-white px-2.5 py-1.5 text-sm font-normal outline-none focus:border-[#397052]"
              />
            </label>

            <label className="text-xs font-medium text-[#202522]">
              Current Reading (kWh)
              <input
                type="number"
                min="0"
                value={draft.currentElectricityReading}
                onChange={(e) => updateDraft("currentElectricityReading", e.target.value === "" ? "" : Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-[#dcd9d1] bg-white px-2.5 py-1.5 text-sm font-normal outline-none focus:border-[#397052]"
              />
            </label>

            <label className="text-xs font-medium text-[#202522]">
              Rate per kWh (₱)
              <input
                type="number"
                step="0.01"
                min="0"
                value={draft.electricityRatePerKwh}
                onChange={(e) => updateDraft("electricityRatePerKwh", e.target.value === "" ? "" : Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-[#dcd9d1] bg-white px-2.5 py-1.5 text-sm font-normal outline-none focus:border-[#397052]"
              />
            </label>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-[#dcd9d1] pt-3 text-xs">
            <span className="text-[#707770]">
              Consumed Usage:{" "}
              <strong>
                {Math.max(0, (Number(draft.currentElectricityReading) || 0) - (Number(draft.previousElectricityReading) || 0))} kWh
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
            <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 border border-dashed border-[#cbc7bc] bg-white px-4 py-5 text-sm font-semibold text-[#707770] transition-colors hover:border-[#397052] hover:text-[#397052]">
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
              className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#397052]"
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
              className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#397052]"
            />
          </label>

          <label className="text-sm font-medium text-[#202522]">
            Due Date
            <input
              type="date"
              required
              value={draft.dueDate}
              onChange={(e) => updateDraft("dueDate", e.target.value)}
              className="mt-2 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#397052]"
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
            onClick={handleClose}
            className="rounded-md px-4 py-2.5 text-sm font-semibold text-[#707770] hover:text-[#202522]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-[#202522] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : billing ? "Save Changes" : "Issue Invoice"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
