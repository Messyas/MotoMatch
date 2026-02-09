"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getResumoPorDispositivo } from "@/services/comentario.service";

type DeviceCommentSummaryProps = {
  dispositivoId: string;
};

function formatDateTime(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCount(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) return null;
  return new Intl.NumberFormat("pt-BR").format(Math.round(value));
}

export function DeviceCommentSummary({
  dispositivoId,
}: DeviceCommentSummaryProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dispositivo", dispositivoId, "resumo"],
    queryFn: () => getResumoPorDispositivo(dispositivoId),
    enabled: Boolean(dispositivoId),
  });

  if (isLoading) {
    return (
      <div className="w-full">
        <Card className="border">
          <CardHeader>
            <Skeleton className="h-6 w-56" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-4 w-32" />
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
              Resumo das opiniões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-justify">
              Não foi possível carregar o resumo agregado dos comentários.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ultimaAtualizacao = formatDateTime(data.ultimaAtualizacao);
  const totalAvaliacoes =
    data.totalAvaliacoes ?? data.totalAnalisesConsideradas ?? null;
  const totalAvaliacoesFormatado = formatCount(totalAvaliacoes);

  return (
    <div className="w-full">
      <Card className="border">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Resumo das opiniões
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.resumo ? (
            <p className="text-base leading-relaxed text-foreground/90 text-justify">
              {data.resumo}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground text-justify">
              Ainda não há resumos disponíveis para este dispositivo.
            </p>
          )}
          {totalAvaliacoesFormatado || ultimaAtualizacao ? (
            <div className="text-xs text-muted-foreground space-y-1">
              {totalAvaliacoesFormatado ? (
                <p className="text-justify">
                  Baseado em {totalAvaliacoesFormatado}{" "}
                  {totalAvaliacoes === 1 ? "avaliação" : "avaliações"}.
                </p>
              ) : null}
              {ultimaAtualizacao ? (
                <p className="text-justify">
                  Atualizado em {ultimaAtualizacao}.
                </p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
