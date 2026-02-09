"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Trash2, Pencil, Plus, Smartphone } from "lucide-react";
import type { PhoneItem } from "@/types/phones";

interface DeviceListProps {
  devices: PhoneItem[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}

export function DeviceList({ devices, onEdit, onDelete, onCreate }: DeviceListProps) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Dispositivos</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os dispositivos cadastrados.
          </p>
        </div>
        <Button onClick={onCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Novo dispositivo
        </Button>
      </div>

      <Separator />

      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {devices.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center text-center py-16 border rounded-lg bg-muted/20">
            <p className="text-muted-foreground mb-2">Nenhum dispositivo encontrado.</p>
            <Button variant="secondary" onClick={onCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar novo
            </Button>
          </div>
        )}

        {devices.map((device) => (
          <Card
            key={device.id}
            className="group w-full bg-[#f5f3f1] border border-gray-200 rounded-2xl shadow-sm scroll-m-2 overflow-hidden flex flex-col transition-transform duration-300 hover:scale-[1.02] hover:border-gray-300"
          >
            <CardContent className="flex flex-1 flex-col items-center gap-4 p-4">
              <div className="relative aspect-square w-full rounded-xl bg-white flex items-center justify-center overflow-hidden">
                {device.imageUrls?.[0] ? (
                  <Image
                    src={device.imageUrls[0]}
                    alt={device.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    className="object-contain p-4 transition-transform duration-500 group-hover:scale-[1.03]"
                    priority
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[#001428]/40">
                    <Smartphone className="h-9 w-9" />
                    <span className="text-xs font-medium">Imagem indisponível</span>
                  </div>
                )}
              </div>

              <h3 className="w-full text-center text-sm font-semibold leading-snug text-[#001428] line-clamp-2">
                {device.title}
              </h3>

              <div className="mt-auto flex w-full items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => onEdit(device.id)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#001428]/15 bg-white/70 text-[#001428] transition-colors hover:bg-[#001428]/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#001428]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f5f3f1]"
                >
                  <Pencil className="h-5 w-5" aria-hidden="true" />
                  <span className="sr-only">Editar dispositivo</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(device.id)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-rose-200 bg-white/80 text-rose-500 transition-colors hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f5f3f1]"
                >
                  <Trash2 className="h-5 w-5" aria-hidden="true" />
                  <span className="sr-only">Excluir dispositivo</span>
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
