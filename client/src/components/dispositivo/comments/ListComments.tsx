"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RatingStars } from "@/components/dispositivo/common/RatingStars";
import { getComentariosPorDispositivo } from "@/services/comentario.service";
import type { ComentarioDetalhado } from "@/types/comentarios";

type ListCommentsProps = {
  dispositivoId: string;
};

function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) {
      return "Data desconhecida";
    }
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return "Data desconhecida";
  }
}

function ComentarioCard({ comentario }: Readonly<{ comentario: ComentarioDetalhado }>) {
  return (
    <Card className="shadow-lg border bg-muted/50">
      <CardHeader className="p-4 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-sm">
            {comentario.autor ?? "Anônimo"}
          </span>
          <span className="text-xs text-muted-foreground">
            • {formatDate(comentario.publicadoEm)}
          </span>
          {comentario.nota !== null ? (
            <div className="flex items-center gap-1 ml-auto">
              <RatingStars value={comentario.nota} iconSize="size-3.5" />
              <span className="text-xs text-muted-foreground">
                {comentario.nota}/5
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground ml-auto">
              Sem nota
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {comentario.resumo ? (
          <p className="text-xs text-muted-foreground mb-2">
            Resumo: {comentario.resumo}
          </p>
        ) : null}
        <p className="text-sm text-foreground/90 text-pretty">
          {comentario.conteudo}
        </p>
      </CardContent>
    </Card>
  );
}

export function ListComments({ dispositivoId }: Readonly<ListCommentsProps>) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dispositivo", dispositivoId, "comentarios"],
    queryFn: () => getComentariosPorDispositivo(dispositivoId),
    enabled: Boolean(dispositivoId),
  });

  const { primeirosCinco, demais } = useMemo(() => {
    const comentarios = data?.comentarios ?? [];
    return {
      primeirosCinco: comentarios.slice(0, 5),
      demais: comentarios.slice(5),
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto mt-12">
        <Skeleton className="h-8 w-40 mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="w-full max-w-4xl mx-auto mt-12">
        <h3 className="text-xl font-semibold mb-4">Comentários e Análises</h3>
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar os comentários no momento.
        </p>
      </div>
    );
  }

  if (data.comentarios.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto mt-12">
        <h3 className="text-xl font-semibold mb-4">Comentários e Análises</h3>
        <p className="text-sm text-muted-foreground">
          Ainda não temos opiniões cadastradas para este dispositivo.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h3 className="text-xl font-semibold">Comentários e Análises</h3>
          <p className="text-sm text-muted-foreground">
            {data.totalReviews}{" "}
            {data.totalReviews === 1 ? "opinião" : "opiniões"} registradas
          </p>
        </div>
        {data.averageRating !== null ? (
          <div className="flex flex-col items-start sm:items-end gap-1">
            <RatingStars value={data.averageRating} iconSize="size-5" />
            <span className="text-sm text-muted-foreground">
              Nota média {data.averageRating.toFixed(1)} de 5
            </span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">
            Sem avaliações com nota até o momento
          </span>
        )}
      </div>

      <div className="space-y-6">
        {primeirosCinco.map((comentario) => (
          <ComentarioCard key={comentario.idComentario} comentario={comentario} />
        ))}
      </div>

      {demais.length > 0 ? (
        <div className="mt-6 flex justify-center">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="link" className="text-sm">
                Mostrar todas as opiniões
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Opiniões de usuários</DialogTitle>
              </DialogHeader>
              <div className="max-h-[70vh] overflow-y-auto space-y-4 pr-2">
                {data.comentarios.map((comentario) => (
                  <ComentarioCard
                    key={comentario.idComentario}
                    comentario={comentario}
                  />
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ) : null}
    </div>
  );
}
