"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { RatingStars } from "@/components/dispositivo/common/RatingStars";
import { getResumoPorDispositivo } from "@/services/comentario.service";
import type { ResumoComentarioMetric } from "@/types/comentarios";

type DeviceCommentScoresProps = {
  dispositivoId: string;
};

function formatScore(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }
  return value.toFixed(1).replace(".", ",");
}

function formatCount(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) return null;
  return new Intl.NumberFormat("pt-BR").format(Math.round(value));
}

export function DeviceCommentScores({
  dispositivoId,
}: DeviceCommentScoresProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dispositivo", dispositivoId, "resumo"],
    queryFn: () => getResumoPorDispositivo(dispositivoId),
    enabled: Boolean(dispositivoId),
  });

  const metricasOrdenadas = useMemo<ResumoComentarioMetric[]>(() => {
    if (!data?.metricas?.length) return [];
    return [...data.metricas].sort((a, b) => {
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      return b.score - a.score;
    });
  }, [data]);

  const notaGeral =
    data && typeof data.notaGeral === "number"
      ? data.notaGeral
      : null;
  const notaGeralFormatada =
    notaGeral !== null ? formatScore(notaGeral) : null;
  const totalAvaliacoes =
    data?.totalAvaliacoes ?? data?.totalAnalisesConsideradas ?? null;
  const totalAvaliacoesFormatado = formatCount(totalAvaliacoes);

  if (isLoading) {
    return (
      <div className="w-full">
        <Card className="border">
          <CardHeader>
            <Skeleton className="h-6 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="w-full">
        <Card className="border">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              Indicadores da avaliação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-justify">
              Não foi possível carregar os indicadores agregados no momento.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Card className="border">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Indicadores da avaliação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {notaGeral !== null ? (
            <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-2">
                <div>
                  <p className="text-sm text-muted-foreground font-medium text-justify">
                    Nota geral dos clientes
                  </p>
                  {totalAvaliacoesFormatado ? (
                    <p className="text-xs text-muted-foreground text-justify">
                      Baseado em {totalAvaliacoesFormatado}{" "}
                      {totalAvaliacoes === 1 ? "avaliação" : "avaliações"}.
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <RatingStars value={notaGeral} iconSize="size-6" />
                  <span className="text-2xl font-semibold text-foreground">
                    {notaGeralFormatada}
                  </span>
                </div>
              </div>
              {metricasOrdenadas.length ? <Separator /> : null}
            </div>
          ) : null}

          {metricasOrdenadas.length ? (
            <div className="space-y-3">
              {metricasOrdenadas.map((metrica) => (
                <div key={metrica.chave || metrica.rotulo}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-medium text-muted-foreground">
                      {metrica.rotulo}
                    </span>
                    <span className="text-base font-semibold text-foreground">
                      {formatScore(metrica.score)}
                    </span>
                  </div>
                  <Separator />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-justify">
              Ainda não há indicadores numéricos disponíveis para este
              dispositivo.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
