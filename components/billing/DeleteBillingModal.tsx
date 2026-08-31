import React, { useState } from "react";
import Modal from "@/components/ui/Modal";
import { Billing } from "@/types";
import { TrashIcon } from "@phosphor-icons/react";
import { endpoints } from "@/api/clients";
import { supabase } from "@/lib/supabase";

interface DeleteBillingModalProps {
  billing: Billing | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteBillingModal({ billing, onClose, onSuccess }: DeleteBillingModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storagePathFor = (url: string) => {
    const marker = "/storage/v1/object/public/room-images/";
    const markerIndex = url.indexOf(marker);
    return markerIndex >= 0 ? decodeURIComponent(url.slice(markerIndex + marker.length)) : null;
  };

  const deleteBilling = async () => {
    if (!billing) return;
    setDeleting(true);
    setError(null);
    try {
      if (billing.electricityReadingImg && supabase) {
        const path = storagePathFor(billing.electricityReadingImg);
        if (path) {
          const { error: removeError } = await supabase.storage.from("room-images").remove([path]);
          if (removeError) {
            console.error("Failed to delete meter photo from Supabase:", removeError);
          }
        }
      }
      await endpoints.billing.remove(billing.id);
      onSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to delete invoice.";
      setError(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={!!billing}
      onClose={() => !deleting && onClose()}
      title={
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#397052] dark:text-[#55a278]">Permanent action</p>
          <h2 className="mt-2 text-xl font-semibold text-[#202522] dark:text-gray-100">Delete Invoice #{billing?.id}?</h2>
        </div>
      }
      maxWidth="md"
      closeOnOutsideClick={!deleting}
      hideCloseButton={deleting}
      className="p-5 sm:p-7 border-t-[#397052] dark:border-t-[#55a278]"
    >
      {billing && (
        <>
          <p className="text-sm leading-6 text-[#707770] dark:text-gray-400">
            This removes the invoice record from Aiven and deletes its linked meter photo from Supabase Storage.
          </p>

          {error && (
            <p className="mt-3 text-sm text-[#9d4937] bg-[#f8e1e1] p-3 rounded-md border border-[#e1b8ae]">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={deleting}
              onClick={onClose}
              className="rounded-md px-4 py-2.5 text-sm font-semibold text-[#707770] hover:text-[#202522] dark:text-gray-400 dark:hover:text-white"
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
        </>
      )}
    </Modal>
  );
}
