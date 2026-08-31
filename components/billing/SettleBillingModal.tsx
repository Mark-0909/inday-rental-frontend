import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { Billing } from "@/types";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { endpoints } from "@/api/clients";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

interface SettleBillingModalProps {
  billing: Billing | null;
  onClose: () => void;
  onSuccess: (updatedBilling: Billing) => void;
}

export default function SettleBillingModal({ billing, onClose, onSuccess }: SettleBillingModalProps) {
  const [settleDate, setSettleDate] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (billing) {
      setSettleDate(new Date().toISOString().slice(0, 10));
      setError(null);
    }
  }, [billing]);

  const confirmSettlement = async () => {
    if (!billing) return;
    setProcessing(true);
    setError(null);

    try {
      const payload = {
        tenantId: billing.tenant.id,
        roomId: billing.room.id,
        rentAmount: billing.rentAmount,
        previousElectricityReading: billing.previousElectricityReading,
        currentElectricityReading: billing.currentElectricityReading,
        electricityRatePerKwh: billing.electricityRatePerKwh,
        waterBill: billing.waterBill,
        billingDate: billing.billingDate,
        dueDate: billing.dueDate,
        status: "PAID",
        datePaid: settleDate || new Date().toISOString().slice(0, 10),
      };

      const response = await endpoints.billing.update(billing.id, payload);
      onSuccess(response.data as Billing);
    } catch (settleErr: any) {
      const msg = settleErr.response?.data?.message || settleErr.message || "Failed to settle invoice.";
      setError(msg);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={!!billing}
      onClose={() => !processing && onClose()}
      title={
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#397052] dark:text-[#55a278]">Payment Processing</p>
          <h2 className="mt-2 text-xl font-semibold text-[#202522] dark:text-gray-100">
            Settle {billing ? formatCurrency(billing.totalAmount) : ""}?
          </h2>
        </div>
      }
      maxWidth="md"
      closeOnOutsideClick={!processing}
      hideCloseButton={processing}
      className="p-5 sm:p-7 border-t-[#397052] dark:border-t-[#55a278]"
    >
      {billing && (
        <>
          <p className="text-sm leading-6 text-[#707770] dark:text-gray-300">
            Record settlement for <strong className="dark:text-gray-100">{billing.tenant?.fullName}</strong>.
          </p>

          {error && (
            <p className="mt-3 text-sm text-[#9d4937] bg-[#f8e1e1] p-3 rounded-md border border-[#e1b8ae]">
              {error}
            </p>
          )}

          <div className="mt-4">
            <label className="block text-sm font-medium text-[#202522] dark:text-gray-200">
              Payment Date
              <input
                type="date"
                required
                value={settleDate}
                onChange={(e) => setSettleDate(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-[#dcd9d1] bg-white px-3 py-2 text-sm outline-none focus:border-[#397052] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white dark:focus:border-[#55a278]"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={processing}
              onClick={onClose}
              className="rounded-md px-4 py-2.5 text-sm font-semibold text-[#707770] hover:text-[#202522] dark:text-gray-400 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={processing}
              onClick={confirmSettlement}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#397052] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2e5942] disabled:opacity-50"
            >
              <CheckCircleIcon size={16} />
              {processing ? "Recording..." : "Confirm & Generate Receipt"}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
