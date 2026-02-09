"use client";

import { useState } from "react";
import {
  Toast,
  ToastProvider,
  ToastViewport,
  ToastTitle,
  ToastDescription,
} from "./toast";

interface ToastOptions {
  title: string;
  description?: string;
  className?: string;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<(ToastOptions & { id: string })[]>([]);

  const toast = (options: ToastOptions) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...options, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const Toasts = () => (
    <ToastProvider>
      {toasts.map((t) => (
        <Toast key={t.id} className={t.className}>
          <ToastTitle>{t.title}</ToastTitle>
          {t.description && (
            <ToastDescription>{t.description}</ToastDescription>
          )}
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );

  return { toast, Toasts };
};
