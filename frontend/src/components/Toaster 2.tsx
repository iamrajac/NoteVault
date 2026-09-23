"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { TOAST_EVENT, type Toast } from "@/lib/toast";

const DURATION_MS = 6000;

export default function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const toast = (e as CustomEvent<Toast>).detail;
      setToasts((prev) => [...prev.slice(-3), toast]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== toast.id)), DURATION_MS);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.kind === "error" ? "alert" : "status"}
          className={`pointer-events-auto flex items-start justify-between gap-3 break-words rounded-xl border p-3 text-sm shadow-lg ${
            t.kind === "error"
              ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
              : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
          }`}
        >
          <span className="min-w-0">{t.message}</span>
          <button onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} aria-label="Dismiss" className="shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
