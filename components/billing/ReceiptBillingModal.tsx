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

  const handlePrint = () => {
    const html = document.documentElement;
    const body = document.body;
    const wasDarkHtml = html.classList.contains("dark");
    const wasDarkBody = body.classList.contains("dark");

    if (wasDarkHtml) html.classList.remove("dark");
    if (wasDarkBody) body.classList.remove("dark");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
        if (wasDarkHtml) html.classList.add("dark");
        if (wasDarkBody) body.classList.add("dark");
      });
    });
  };

  return createPortal(
    <div
      id="printable-receipt-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#202522]/60 p-4 print:static print:inset-auto print:block print:bg-white print:p-0"
      role="presentation"
      onClick={onClose}
    >
      <style>{`
        @page {
          margin: 10mm 12mm;
          size: auto;
        }
        @media print {
          :root, :root.dark, html, html.dark, body, body.dark, .dark, .dark * {
            color-scheme: light !important;
            --background: #ffffff !important;
            --foreground: #000000 !important;
            --color-background: #ffffff !important;
            --color-foreground: #000000 !important;
            background-color: #ffffff !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          html, body {
            background-color: #ffffff !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-receipt-modal,
          #printable-receipt-modal * {
            visibility: visible !important;
          }
          #printable-receipt-modal {
            position: relative !important;
            left: auto !important;
            top: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
            background: transparent !important;
            width: auto !important;
            height: auto !important;
          }
          #printable-receipt-container {
            position: relative !important;
            left: auto !important;
            top: auto !important;
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

      <section
        id="printable-receipt-container"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[95vh] w-full max-w-85 overflow-hidden rounded-md border-t-4 border-[#397052] bg-white p-5 text-[#202522] shadow-2xl dark:border-[#55a278] dark:bg-[#121212] dark:text-gray-200 print:relative print:max-h-none print:max-w-[340px] print:w-full print:rounded-none print:shadow-none print:border-r print:border-b print:border-dashed print:border-gray-400 print:border-l-0 print:border-t-0 print:m-0"
      >
        <div
          id="receipt-watermark-bg"
          className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.08]"
          aria-hidden="true"
        >
          <HouseIcon size={190} weight="fill" className="text-[#397052]" />
        </div>

        <div className="relative z-10 space-y-3 font-mono text-[11px] leading-tight text-[#202522] dark:text-gray-200 print:text-[#202522]">
          <div className="text-center">
            <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#dcecdf] text-[#397052] dark:bg-[#397052]/20 dark:text-[#55a278] print:bg-transparent print:text-black">
              <HouseIcon size={14} weight="fill" className="print:hidden" />
            </div>
            <h2 className="text-xs font-bold tracking-wider uppercase text-[#202522] dark:text-gray-100 print:text-[#202522]">Inday Rental Properties</h2>
            <p className="text-[10px] text-[#707770] dark:text-gray-400 print:text-[#707770]">Official Payment Receipt</p>
            <p className="text-[9px] text-[#858b84] mt-0.5 dark:text-gray-500 print:text-[#858b84]">Sunny Brooke II, Brgy. San Francisco, General Trias, Cavite</p>
            <div className="mt-2 inline-block rounded-full border border-[#b4d2be] bg-[#dcecdf] px-2.5 py-0.5 text-[9px] font-bold tracking-wider uppercase text-[#397052] dark:border-[#55a278]/30 dark:bg-[#55a278]/20 dark:text-[#55a278] print:border-[#b4d2be] print:bg-[#dcecdf] print:text-[#397052]">
              PAID IN FULL
            </div>
          </div>

          <div className="border-y border-dashed border-[#cbc7bc] py-2 space-y-1 text-[10px] dark:border-white/10 print:border-[#cbc7bc]">
            <div className="flex justify-between">
              <span className="text-[#707770] dark:text-gray-400 print:text-[#707770]">REC NO:</span>
              <span className="font-semibold text-[#202522] dark:text-gray-100 print:text-[#202522]">REC-{billing.id.toString().padStart(6, "0")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#707770] dark:text-gray-400 print:text-[#707770]">DATE PAID:</span>
              <span className="text-[#202522] dark:text-gray-100 print:text-[#202522]">{formatDate(billing.datePaid)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#707770] dark:text-gray-400 print:text-[#707770]">TENANT:</span>
              <span className="font-semibold text-[#202522] dark:text-gray-100 print:text-[#202522]">{billing.tenant?.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#707770] dark:text-gray-400 print:text-[#707770]">ASSIGNED:</span>
              <span className="text-[#202522] dark:text-gray-100 print:text-[#202522]">Room {billing.room?.roomNumber ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#707770] dark:text-gray-400 print:text-[#707770]">PERIOD:</span>
              <span className="text-[#202522] dark:text-gray-100 print:text-[#202522]">{formatDate(billing.billingDate)}</span>
            </div>
          </div>

          <div className="space-y-1.5 text-[10px]">
            <div className="flex justify-between">
              <span className="text-[#5b625b] dark:text-gray-400 print:text-[#5b625b]">Monthly Rent:</span>
              <span className="font-medium text-[#202522] dark:text-gray-100 print:text-[#202522]">{formatCurrency(billing.rentAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5b625b] dark:text-gray-400 print:text-[#5b625b]">Water Bill:</span>
              <span className="font-medium text-[#202522] dark:text-gray-100 print:text-[#202522]">{formatCurrency(billing.waterBill)}</span>
            </div>

            <div className="border-t border-dotted border-[#cbc7bc] pt-1 space-y-0.5 dark:border-white/10 print:border-[#cbc7bc]">
              <div className="flex justify-between">
                <span className="font-semibold text-[#202522] dark:text-gray-100 print:text-[#202522]">Electricity:</span>
                <span className="font-semibold text-[#202522] dark:text-gray-100 print:text-[#202522]">{formatCurrency(billing.electricityBill)}</span>
              </div>
              <div className="flex justify-between text-[9px] text-[#707770] dark:text-gray-400 print:text-[#707770]">
                <span>- Curr Reading:</span>
                <span>{billing.currentElectricityReading} kWh</span>
              </div>
              <div className="flex justify-between text-[9px] text-[#707770] dark:text-gray-400 print:text-[#707770]">
                <span>- Prev Reading:</span>
                <span>{billing.previousElectricityReading} kWh</span>
              </div>
              <div className="flex justify-between text-[9px] text-[#707770] dark:text-gray-400 print:text-[#707770]">
                <span>- Consumed Usage:</span>
                <span>{Math.max(0, billing.currentElectricityReading - billing.previousElectricityReading)} kWh</span>
              </div>
              <div className="flex justify-between text-[9px] text-[#707770] dark:text-gray-400 print:text-[#707770]">
                <span>- Unit Rate:</span>
                <span>₱{billing.electricityRatePerKwh}/kWh</span>
              </div>
            </div>

            <div className="border-t border-[#202522] pt-2 flex justify-between font-bold text-xs dark:border-white/20 print:border-[#202522]">
              <span className="text-[#202522] dark:text-gray-100 print:text-[#202522]">TOTAL PAID:</span>
              <span className="text-[#397052] dark:text-[#55a278] print:text-[#397052]">{formatCurrency(billing.totalAmount)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-[#cbc7bc] pt-2 text-center text-[9px] text-[#707770] dark:border-white/10 dark:text-gray-400 print:border-[#cbc7bc] print:text-[#707770]">
            <p>Thank you for your prompt payment!</p>
            <p>Please retain this receipt for your records.</p>
          </div>
        </div>

        <div className="print:hidden relative z-10 mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#cbc7bc] px-3 py-1.5 text-xs font-semibold text-[#707770] hover:text-[#202522] dark:border-white/10 dark:text-gray-400 dark:hover:border-white/30 dark:hover:text-white"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
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
