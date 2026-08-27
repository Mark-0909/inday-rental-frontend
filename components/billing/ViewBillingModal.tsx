import React from "react";
import Modal from "@/components/ui/Modal";
import { Billing } from "@/types";
import { ReceiptIcon } from "@phosphor-icons/react";

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

interface ViewBillingModalProps {
  billing: Billing | null;
  onClose: () => void;
  onOpenReceipt: (billing: Billing) => void;
}

export default function ViewBillingModal({ billing, onClose, onOpenReceipt }: ViewBillingModalProps) {
  return (
    <Modal
      isOpen={!!billing}
      onClose={onClose}
      title={
        billing ? (
          <div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                billing.status === "PAID"
                  ? "bg-[#dcecdf] text-[#397052]"
                  : billing.status === "OVERDUE"
                  ? "bg-[#fbeae5] text-[#9d4937]"
                  : "bg-[#eee4d6] text-[#94613a]"
              }`}
            >
              {billing.status}
            </span>
            <h2 className="mt-2 text-xl font-semibold text-[#202522]">
              {billing.tenant?.fullName}
            </h2>
            <p className="text-xs text-[#707770]">Room {billing.room?.roomNumber ?? "-"}</p>
          </div>
        ) : undefined
      }
      maxWidth="lg"
      className="p-5 sm:p-7"
    >
      {billing && (
        <>
          <div className="space-y-4 text-sm">
            <div className="rounded-md border border-[#dcd9d1] bg-white p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#707770]">Statement Summary</p>
              <div className="space-y-1.5 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-[#707770]">Billing Date</span>
                  <span className="font-medium text-[#202522]">{formatDate(billing.billingDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#707770]">Due Date</span>
                  <span className="font-medium text-[#202522]">{formatDate(billing.dueDate)}</span>
                </div>
                {billing.datePaid && (
                  <div className="flex justify-between">
                    <span className="text-[#707770]">Date Paid</span>
                    <span className="font-medium text-[#397052]">{formatDate(billing.datePaid)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-md border border-[#dcd9d1] bg-white p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#707770]">Itemized Cost Matrix</p>
              <div className="space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-[#707770]">Monthly Base Rent</span>
                  <span className="font-medium">{formatCurrency(billing.rentAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#707770]">Water Dues (Fixed/Metered)</span>
                  <span className="font-medium">{formatCurrency(billing.waterBill)}</span>
                </div>

                <div className="rounded-md border border-[#eee4d6] bg-[#fcfbf9] p-3 text-xs space-y-1.5">
                  <div className="flex justify-between font-semibold text-[#202522]">
                    <span>Electricity Subtotal:</span>
                    <span>{formatCurrency(billing.electricityBill)}</span>
                  </div>
                  <div className="flex justify-between text-[#707770]">
                    <span>Current Reading:</span>
                    <span className="font-mono">{billing.currentElectricityReading} kWh</span>
                  </div>
                  <div className="flex justify-between text-[#707770]">
                    <span>Previous Reading:</span>
                    <span className="font-mono">{billing.previousElectricityReading} kWh</span>
                  </div>
                  <div className="flex justify-between border-t border-[#eee4d6] pt-1 text-[#202522]">
                    <span>Consumed Electricity:</span>
                    <span className="font-semibold">
                      {Math.max(
                        0,
                        billing.currentElectricityReading - billing.previousElectricityReading
                      )}{" "}
                      kWh
                    </span>
                  </div>
                  <div className="flex justify-between text-[#707770]">
                    <span>Rate per kWh:</span>
                    <span>₱{billing.electricityRatePerKwh}/kWh</span>
                  </div>
                  <div className="text-[11px] text-[#94613a] italic pt-0.5">
                    Formula: {Math.max(0, billing.currentElectricityReading - billing.previousElectricityReading)} kWh × ₱{billing.electricityRatePerKwh} = {formatCurrency(billing.electricityBill)}
                  </div>
                </div>

                <div className="flex justify-between border-t border-[#dcd9d1] pt-2.5 text-base font-bold text-[#202522]">
                  <span>Total Due</span>
                  <span>{formatCurrency(billing.totalAmount)}</span>
                </div>
              </div>
            </div>

            {billing.electricityReadingImg && (
              <div className="rounded-md border border-[#dcd9d1] bg-white p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#707770]">
                  Meter Reading Proof
                </p>
                <a
                  href={billing.electricityReadingImg}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded border border-[#dcd9d1]"
                >
                  <img
                    src={billing.electricityReadingImg}
                    alt="Meter Proof"
                    className="h-44 w-full object-cover"
                  />
                </a>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-2">
            {billing.status === "PAID" && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenReceipt(billing);
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#397052] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2e5942]"
              >
                <ReceiptIcon size={16} /> View Receipt
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[#cbc7bc] px-4 py-2 text-sm font-semibold text-[#202522] hover:border-[#202522]"
            >
              Close
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
