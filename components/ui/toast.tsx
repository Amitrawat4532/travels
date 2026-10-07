"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastItem = { id: number; tone: "success" | "error"; message: string };
type Listener = (t: ToastItem) => void;

const listeners = new Set<Listener>();
let seq = 0;

function emit(tone: ToastItem["tone"], message: string) {
  const item = { id: ++seq, tone, message };
  listeners.forEach((l) => l(item));
}

export const toast = {
  success: (message: string) => emit("success", message),
  error: (message: string) => emit("error", message),
};

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener: Listener = (t) => {
      setItems((prev) => [...prev.slice(-2), t]);
      window.setTimeout(() => setItems((prev) => prev.filter((p) => p.id !== t.id)), 4500);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex w-full max-w-sm animate-fade-in items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lift",
            t.tone === "success" ? "bg-forest-800 text-white" : "bg-danger-700 text-white",
          )}
        >
          {t.tone === "success" ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          ) : (
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          )}
          <span className="flex-1">{t.message}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setItems((prev) => prev.filter((p) => p.id !== t.id))}
            className="opacity-70 hover:opacity-100"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
