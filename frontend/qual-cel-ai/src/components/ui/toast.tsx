"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { cn } from "@/lib/utils"; // sua função de className condicional

export const ToastProvider = ToastPrimitive.Provider;

export const ToastViewport = () => (
  <ToastPrimitive.Viewport className="fixed bottom-0 right-0 flex flex-col p-4 gap-2 w-[360px] max-w-full z-[9999] outline-none" />
);

interface ToastProps extends ToastPrimitive.ToastProps {
  className?: string;
}

export const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  ToastProps
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Root
    ref={ref}
    className={cn(
      "bg-white rounded-lg p-4 shadow-md border border-gray-200",
      className
    )}
    {...props}
  />
));

export const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Title>,
  React.ComponentProps<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title
    ref={ref}
    className={cn("font-semibold text-gray-900", className)}
    {...props}
  />
));

export const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Description>,
  React.ComponentProps<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description
    ref={ref}
    className={cn("text-sm text-gray-700", className)}
    {...props}
  />
));

export const ToastAction = ToastPrimitive.Action;

ToastViewport.displayName = "ToastViewport";
Toast.displayName = "Toast";
ToastTitle.displayName = "ToastTitle";
ToastDescription.displayName = "ToastDescription";
