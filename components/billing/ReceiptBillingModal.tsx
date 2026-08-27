import React from "react";
import { createPortal } from "react-dom";
import { Billing } from "@/types";
import { HouseIcon, PrinterIcon } from "@phosphor-icons/react";

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

interface ReceiptBillingModalProps {
  billing: Billing | null;
  onClose: () => void;
}

export default function ReceiptBillingModal({ billing, onClose }: ReceiptBillingModalProps) {
  if (!billing || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      id="printable-receipt-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#202522]/60 p-4"
      role="presentation"
      onClick={onClose}
    >
      <section
        id="printable-receipt-container"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[95vh] w-full max-w-85 overflow-hidden rounded-md border-t-4 border-[#397052] bg-white p-5 text-[#202522] shadow-2xl"
      >
        <div
          id="receipt-watermark-bg"
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.08]"
          aria-hidden="true"
        >
          <HouseIcon size={190} weight="fill" className="text-[#397052]" />
        </div>

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
              <span className="font-semibold text-[#202522]">REC-{billing.id.toString().padStart(6, "0")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#707770]">DATE PAID:</span>
              <span className="text-[#202522]">{formatDate(billing.datePaid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#707770]">TENANT:</span>
              <span className="font-semibold text-[#202522]">{billing.tenant?.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#707770]">ASSIGNED:</span>
              <span className="text-[#202522]">Room {billing.room?.roomNumber ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#707770]">PERIOD:</span>
              <span className="text-[#202522]">{formatDate(billing.billingDate)}</span>
            </div>
          </div>

          <div className="space-y-1.5 text-[10px]">
            <div className="flex justify-between">
              <span className="text-[#5b625b]">Monthly Rent:</span>
              <span className="font-medium text-[#202522]">{formatCurrency(billing.rentAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5b625b]">Water Bill:</span>
              <span className="font-medium text-[#202522]">{formatCurrency(billing.waterBill)}</span>
            </div>

            <div className="border-t border-dotted border-[#cbc7bc] pt-1 space-y-0.5">
              <div className="flex justify-between">
                <span className="font-semibold text-[#202522]">Electricity:</span>
                <span className="font-semibold text-[#202522]">{formatCurrency(billing.electricityBill)}</span>
              </div>
              <div className="flex justify-between text-[9px] text-[#707770]">
                <span>- Curr Reading:</span>
                <span>{billing.currentElectricityReading} kWh</span>
              </div>
              <div className="flex justify-between text-[9px] text-[#707770]">
                <span>- Prev Reading:</span>
                <span>{billing.previousElectricityReading} kWh</span>
              </div>
              <div className="flex justify-between text-[9px] text-[#707770]">
                <span>- Consumed Usage:</span>
                <span>{Math.max(0, billing.currentElectricityReading - billing.previousElectricityReading)} kWh</span>
              </div>
              <div className="flex justify-between text-[9px] text-[#707770]">
                <span>- Unit Rate:</span>
                <span>₱{billing.electricityRatePerKwh}/kWh</span>
              </div>
            </div>

            <div className="border-t border-[#202522] pt-2 flex justify-between font-bold text-xs">
              <span className="text-[#202522]">TOTAL PAID:</span>
              <span className="text-[#397052]">{formatCurrency(billing.totalAmount)}</span>
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
            onClick={onClose}
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
  );
}
