"use client";

import { useState, useEffect } from "react";
import { useDevice } from "@/hooks/useDevice";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DeviceList } from "@/components/dispositivo/management/DeviceList";
import { DeleteConfirmModal } from "@/components/dispositivo/management/DeleteConfirmModal";
import { DeviceModal } from "@/components/dispositivo/management/DeviceModal";
import type { PhoneItem, BackendDispositivo } from "@/types/phones";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { useAuth } from "@/hooks/useAuth";

export default function DevicesPage() {
  const { user, loading: authLoading } = useAuth();
  const [checkingAccess, setCheckingAccess] = useState(true);

  useProtectedRoute(["0", "2"]); // apenas admin e suporte

  useEffect(() => {
    if (!authLoading) {
      // Bloquear acesso
      if (!user || !["0", "2"].includes(user.tipo)) {
        setCheckingAccess(false);
        return;
      }

      setCheckingAccess(false); // usuário permitido
    }
  }, [user, authLoading]);

  const {
    dispositivos,
    loading,
    error,
    create,
    update,
    remove,
    getById,
    refreshLista,
  } = useDevice();

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selected, setSelected] = useState<PhoneItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = () => {
    setSelected(null);
    setModalOpen(true);
  };

  const handleEdit = (id: string) => {
    const device = getById(id);
    if (!device) {
      toast.error("Dispositivo não encontrado para edição.");
      return;
    }
    setSelected(device);
    setModalOpen(true);
  };

  const handleDeleteRequest = (id: string) => {
    const device = getById(id);
    if (!device) {
      toast.error("Dispositivo não encontrado para exclusão.");
      return;
    }
    setSelected(device);
    setDeleteModalOpen(true);
  };

  const convertPayload = (data: {
    fabricante: string;
    modelo: string;
    photos: { title: string; src: string }[];
    caracteristicas: { tipo: string; descricao: string }[];
  }): Omit<PhoneItem, "id"> => {
    const specs = data.caracteristicas.reduce((acc, curr) => {
      acc[curr.tipo] = curr.descricao;
      return acc;
    }, {} as Record<string, string>);

    return {
      title: `${data.fabricante} ${data.modelo}`,
      imageUrls: data.photos.map((p) => p.src).filter(Boolean),
      specs,
    };
  };

  const handleSubmit = async (data: {
    fabricante: string;
    modelo: string;
    photos: { title: string; src: string }[];
    caracteristicas: { tipo: string; descricao: string }[];
  }) => {
    setIsSubmitting(true);
    try {
      const converted = convertPayload(data);

      if (selected?.id) {
        await update(selected.id, converted);
        toast.success("Dispositivo atualizado com sucesso!");
      } else {
        await create(converted);
        toast.success("Dispositivo criado com sucesso!");
      }

      setModalOpen(false);
      setSelected(null);
      refreshLista();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar dispositivo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selected?.id) return;
    setIsSubmitting(true);
    try {
      await remove(selected.id);
      toast.success("Dispositivo excluído com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir dispositivo.");
    } finally {
      setIsSubmitting(false);
      setDeleteModalOpen(false);
      setSelected(null);
      refreshLista();
    }
  };

  if (
    loading &&
    (!dispositivos ||
      dispositivos.length === 0 ||
      authLoading ||
      checkingAccess)
  ) {
    return (
      <div className="flex items-center justify-center h-[80vh] text-muted-foreground">
        Carregando dispositivos...
      </div>
    );
  }

  //Se o usuário não é permitido, não renderiza o conteúdo
  if (!user || !["0", "2"].includes(user.tipo)) {
    return null;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] space-y-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={refreshLista}>Recarregar</Button>
      </div>
    );
  }

  const selectedBackend: BackendDispositivo | undefined = selected
    ? {
        idDispositivo: selected.id,
        fabricante: selected.title.split(" ")[0] || "",
        modelo: selected.title.split(" ").slice(1).join(" ") || "",
        photos: selected.imageUrls?.length
          ? selected.imageUrls.map((src, i) => ({
              title: `${selected.title} - Imagem ${i + 1}`,
              src,
            }))
          : [],
        caracteristicas: Object.entries(selected.specs || {}).map(
          ([tipo, descricao]) => ({
            idDispositivo: selected.id,
            idCaracteristica: tipo,
            caracteristica: {
              idCaracteristica: tipo,
              tipo,
              descricao: descricao ?? "", // <-- garante string
            },
          })
        ),
      }
    : undefined;

  return (
    <div className="container mx-auto px-6 md:px-10 lg:px-16 py-10 space-y-8">
      <DeviceList
        devices={dispositivos}
        onEdit={handleEdit}
        onDelete={handleDeleteRequest}
        onCreate={handleCreate}
      />

      <DeviceModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelected(null);
        }}
        onSubmit={handleSubmit}
        initialData={selectedBackend}
        isSubmitting={isSubmitting}
      />

      <DeleteConfirmModal
        open={deleteModalOpen}
        onCancel={() => {
          setDeleteModalOpen(false);
          setSelected(null);
        }}
        onConfirm={handleConfirmDelete}
        isLoading={isSubmitting}
      />
    </div>
  );
}
