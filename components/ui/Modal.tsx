import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "@phosphor-icons/react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
  align?: "center" | "bottom" | "top";
  closeOnOutsideClick?: boolean;
  hideCloseButton?: boolean;
  className?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "4xl",
  align = "center",
  closeOnOutsideClick = true,
  hideCloseButton = false,
  className = "",
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen || !mounted || typeof document === "undefined") {
    return null;
  }

  const maxWidthClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
  }[maxWidth];

  const alignClass = {
    center: "items-center",
    bottom: "items-end md:items-center",
    top: "items-start",
  }[align];

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-[#202522]/60 dark:bg-black/80 p-0 md:p-6 transition-opacity duration-200 ${alignClass} print:hidden`}
      role="presentation"
      onClick={() => closeOnOutsideClick && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className={`relative w-full max-h-[92vh] overflow-y-auto border-t-2 border-[#202522] bg-[#f8f7f3] dark:border-white/10 dark:bg-[#1e1e1e] shadow-2xl p-4 md:p-6 ${maxWidthClass} ${className}`}
      >
        {(title || !hideCloseButton) && (
          <div className="mb-5 flex items-start justify-between gap-4 pr-8">
            {title ? (
              typeof title === "string" ? (
                <h2 className="text-base font-semibold text-[#202522] dark:text-gray-100">{title}</h2>
              ) : (
                title
              )
            ) : (
              <div />
            )}
            {!hideCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute top-4 right-4 md:top-5 md:right-5 p-1 text-[#707770] hover:text-[#202522] dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                <XIcon size={20} />
              </button>
            )}
          </div>
        )}
        {children}
      </section>
    </div>,
    document.body
  );
}
