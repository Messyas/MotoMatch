"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import type { BackendDispositivo, PhoneItem } from "@/types/phones";

export interface DeviceFormData {
  fabricante: string;
  modelo: string;
  photos: { title: string; src: string }[];
  caracteristicas: { tipo: string; descricao: string }[];
}

interface DeviceFormProps {
  initialData?: BackendDispositivo | PhoneItem;
  onSubmit: (data: DeviceFormData) => void;
  isSubmitting?: boolean;
}

export function DeviceForm({ initialData, onSubmit, isSubmitting }: DeviceFormProps) {
  const { register, handleSubmit, reset, control } = useForm<DeviceFormData>({
    defaultValues: {
      fabricante: "",
      modelo: "",
      photos: [{ title: "", src: "" }],
      caracteristicas: [{ tipo: "", descricao: "" }],
    },
    shouldUnregister: false,
  });

  const { fields: photoFields, append: addPhoto, remove: removePhoto } = useFieldArray({
    control,
    name: "photos",
  });

  const { fields: caracteristicaFields, append: addCarac, remove: removeCarac } = useFieldArray({
    control,
    name: "caracteristicas",
  });

  useEffect(() => {
    if (!initialData) return;

    if ("fabricante" in initialData) {
      // BackendDispositivo → DeviceFormData
      const backend = initialData as BackendDispositivo;
      reset({
        fabricante: backend.fabricante ?? "",
        modelo: backend.modelo ?? "",
        photos:
          backend.photos?.map((p) => ({
            title: p.title || "",
            src: p.src || "",
          })) ?? [{ title: "", src: "" }],
        caracteristicas:
          backend.caracteristicas?.map((c) => ({
            tipo: c.caracteristica.tipo,
            descricao: c.caracteristica.descricao ?? "",
          })) ?? [{ tipo: "", descricao: "" }],
      });
    } else {
      // PhoneItem → DeviceFormData (garante string para descricao e usa imageUrls[])
      const phone = initialData as PhoneItem;
      reset({
        fabricante: phone.title.split(" ")[0] || "",
        modelo: phone.title.split(" ").slice(1).join(" ") || "",
        photos: phone.imageUrls?.length
          ? phone.imageUrls.map((src, i) => ({ title: `${phone.title} - ${i + 1}`, src }))
          : [{ title: "", src: "" }],
        caracteristicas:
          Object.entries(phone.specs || {}).map(([tipo, descricao]) => ({
            tipo,
            descricao: descricao ?? "",
          })) ?? [{ tipo: "", descricao: "" }],
      });
    }
  }, [initialData, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Fabricante</Label>
          <Input {...register("fabricante", { required: true })} placeholder="Ex: Motorola" />
        </div>
        <div>
          <Label>Modelo</Label>
          <Input {...register("modelo", { required: true })} placeholder="Ex: Moto G" />
        </div>
      </div>

      <Card className="p-4 space-y-3">
        <Label>Fotos</Label>
        {photoFields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <Input {...register(`photos.${index}.title` as const)} placeholder="Título" className="flex-1" />
            <Input {...register(`photos.${index}.src` as const)} placeholder="URL da imagem" className="flex-1" />
            <Button type="button" variant="destructive" onClick={() => removePhoto(index)} size="sm">
              Remover
            </Button>
          </div>
        ))}
        <Button type="button" onClick={() => addPhoto({ title: "", src: "" })} variant="outline">
          + Adicionar foto
        </Button>
      </Card>

      <Card className="p-4 space-y-3">
        <Label>Características</Label>
        {caracteristicaFields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <Input {...register(`caracteristicas.${index}.tipo` as const)} placeholder="Tipo (ex: Memória)" className="flex-1" />
            <Input {...register(`caracteristicas.${index}.descricao` as const)} placeholder="Descrição (ex: 128GB)" className="flex-1" />
            <Button type="button" variant="destructive" onClick={() => removeCarac(index)} size="sm">
              Remover
            </Button>
          </div>
        ))}
        <Button type="button" onClick={() => addCarac({ tipo: "", descricao: "" })} variant="outline">
          + Adicionar característica
        </Button>
      </Card>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
