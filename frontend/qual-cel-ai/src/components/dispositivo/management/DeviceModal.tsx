"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DeviceForm, DeviceFormData } from "./DeviceForm";
import type { PhoneItem, BackendDispositivo } from "@/types/phones";

interface DeviceModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: DeviceFormData) => void;
  initialData?: PhoneItem | BackendDispositivo;
  isSubmitting?: boolean;
}

export function DeviceModal({ open, onClose, onSubmit, initialData, isSubmitting }: DeviceModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] p-0">
        <div className="flex max-h-[90vh] flex-col overflow-hidden">
          <DialogHeader className="sticky top-0 z-10 bg-background border-b p-4">
          <DialogTitle>{initialData ? "Editar Dispositivo" : "Novo Dispositivo"}</DialogTitle>
          <DialogDescription>
            {initialData ? "Atualize as informações do dispositivo." : "Preencha os dados para adicionar um novo dispositivo."}
          </DialogDescription>
        </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6">
            <DeviceForm onSubmit={onSubmit} initialData={initialData} isSubmitting={isSubmitting} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
