"use client";

import { useState, useEffect, useMemo, type ElementType } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SelectorStatItem } from "@/types/admin";
import { HorizontalBarChart } from "../_components/HorizontalBarChart";
import { PriceRangeBarChart } from "../_components/PriceRangeBarChart";
import { SelectorTrendChart } from "../_components/SelectorTrendChart";
import { SelectorUsageCard } from "../_components/SelectorUsageCard";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { useAdminOverviewQuery } from "../_hooks/useAdminOverview";

const numberFormatter = new Intl.NumberFormat("pt-BR");

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type SpecKey = "ram" | "rom" | "battery" | "camera" | "benchmark" | "price_range";

function formatPriceRangeLabel(value: string) {
  const sanitized = value.trim();
  const currency = (amount: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(amount);

  const matchRange = sanitized.match(/^(\d+)\s*-\s*(\d+)\+?$/);
  if (matchRange) {
    const [, start, end] = matchRange;
    return `${currency(Number(start))} - ${currency(Number(end))}`;
  }

  const matchOpenEnd = sanitized.match(/^(\d+)\s*-\s*$/);
  if (matchOpenEnd) {
    return `A partir de ${currency(Number(matchOpenEnd[1]))}`;
  }

  const matchUpTo = sanitized.match(/^0\s*-\s*(\d+)$/);
  if (matchUpTo) {
    return `Até ${currency(Number(matchUpTo[1]))}`;
  }

  return sanitized;
}

type HighlightStat = {
  label: string;
  value: string;
  description?: string;
  icon?: ElementType;
  gradient?: string;
  textColor?: string;
};

export default function AdminDashboardDevicesPage() {
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

  const { data, isLoading, isError, refetch, isRefetching } = useAdminOverviewQuery();

  const highlightStats = useMemo<HighlightStat[]>(() => {
    if (!data) return [];

    const stats: HighlightStat[] = [
      {
        label: "Dispositivos cadastrados",
        value: numberFormatter.format(data.totals.dispositivos),
        description: "Total de dispositivos",
      },
    ];

    if (data.precos) {
      stats.push(
        {
          label: "Preço médio",
          value: currencyFormatter.format(data.precos.medio),
          description: "Média geral dos dispositivos",
          textColor: "text-emerald-600",
        },
        {
          label: "Dispositivo mais barato",
          value: currencyFormatter.format(data.precos.minimo),
          description: data.precos.dispositivoMaisBarato ?? "—",
          textColor: "text-amber-500",
        },
        {
          label: "Dispositivo mais caro",
          value: currencyFormatter.format(data.precos.maximo),
          textColor: "text-blue-600",
          description: data.precos.dispositivoMaisCaro ?? "—",
        }
      );
    }

    if (data.precosFavoritos) {
      stats.push({
        label: "Preço médio dos favoritados",
        value: currencyFormatter.format(data.precosFavoritos.medio),
        description: "Média dos dispositivos",
        textColor: "text-rose-500",
      });
    }

    return stats;
  }, [data]);
  const topFavorites = useMemo(
    () =>
      data?.favorites.top.map((item) => ({
        label: item.title,
        value: item.favorites,
      })) ?? [],
    [data]
  );
  const leastFavorites = useMemo(
    () =>
      data?.favorites.bottom.map((item) => ({
        label: item.title,
        value: item.favorites,
      })) ?? [],
    [data]
  );
  const selectorUsage = useMemo(() => {
    const specs: SpecKey[] = ["ram", "rom", "battery", "camera", "benchmark", "price_range"];
    if (!data) {
      return specs.map((spec) => ({
        spec,
        items: [] as SelectorStatItem[],
      }));
    }
    return specs.map((spec) => ({
      spec,
      items: data.selectorStats?.[spec] ?? [],
    }));
  }, [data]);
  const selectorTimeline = useMemo(
    () =>
      data?.selectorTimeline ?? {
        ram: [],
        rom: [],
        battery: [],
        camera: [],
        benchmark: [],
        price_range: [],
      },
    [data]
  );
  const priceRangeChartData = useMemo(
    () =>
      (data?.priceRangeStats ?? []).map((item) => ({
        label: formatPriceRangeLabel(item.value),
        value: item.count,
      })),
    [data]
  );

  if (authLoading || checkingAccess) {
    return <div className="text-center py-6">Carregando...</div>;
  }

  //Se o usuário não é permitido, não renderiza o conteúdo
  if (!user || !["0", "2"].includes(user.tipo)) {
    return null;
  }

  const isBusy = isLoading || isRefetching;

  return (
    <main className="min-h-screen bg-white px-6 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-[#001428]">DashBoard</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Acompanhe a evolução da base de dados, veja a evolução do desempenho
            de dispositivos a partir deste painel.
          </p>
        </header>

        {isError && (
          <Card className="border border-rose-200 bg-rose-50 text-rose-700">
            <CardContent className="flex items-center justify-between gap-4 py-6">
              <div>
                <h2 className="font-semibold">
                  Não foi possível carregar os indicadores.
                </h2>
                <p className="text-sm text-rose-600">
                  Verifique sua conexão ou tente novamente em instantes.
                </p>
              </div>
              <button
                onClick={() => refetch()}
                className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600"
              >
                Tentar novamente
              </button>
            </CardContent>
          </Card>
        )}

        <section>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {isBusy && !data
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`highlight-skeleton-${index}`}
                    className="rounded-2xl border border-slate-200 bg-white/70 p-4"
                  >
                    <div className="h-4 w-24 rounded bg-slate-200" />
                    <div className="mt-3 h-8 w-32 rounded bg-slate-200" />
                    <div className="mt-2 h-3 w-20 rounded bg-slate-200" />
                  </div>
                ))
              : highlightStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        {stat.label}
                      </span>
                      {stat.icon && (
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br ${stat.gradient} text-white`}
                        >
                          <stat.icon className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <p
                      className={`mt-3 text-2xl font-bold ${
                        stat.textColor ?? "text-[#001428]"
                      }`}
                    >
                      {stat.value}
                    </p>
                    {stat.description && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {stat.description}
                      </p>
                    )}
                  </div>
                ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-[#001428]">
                Top 10 dispositivos mais favoritados
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Popularidade com base no volume total de favoritos.
              </p>
            </CardHeader>
            <CardContent>
              {isBusy && !data ? (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
                </div>
              ) : (
                <HorizontalBarChart
                  data={topFavorites}
                  emptyMessage="Ainda não há favoritos suficientes para exibir este ranking."
                />
              )}
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-[#001428]">
                10 dispositivos menos favoritados
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Equipamentos com menor engajamento em favoritos.
              </p>
            </CardHeader>
            <CardContent>
              {isBusy && !data ? (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
                </div>
              ) : (
                <HorizontalBarChart
                  data={leastFavorites}
                  emptyMessage="Nenhum dispositivo com favoritos registrados até o momento."
                  barClassName="bg-gradient-to-r from-indigo-400 to-blue-500"
                />
              )}
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-[#001428]">
                Faixas de preço mais buscadas
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Distribuição das faixas de preço selecionadas nas pesquisas.
              </p>
            </CardHeader>
            <CardContent>
              {isBusy && !data ? (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
                </div>
              ) : (
                <PriceRangeBarChart data={priceRangeChartData} />
              )}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold text-[#001428]">
              Preferências de pesquisa
            </h2>
            <p className="text-sm text-muted-foreground">
              Acompanhe quais combinações os usuários escolhem com mais
              frequência nos filtros do console.
            </p>
          </div>

          {isBusy && !data ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`selector-skeleton-${index}`}
                  className="h-44 rounded-2xl border border-slate-200 bg-white/70 p-4"
                >
                  <div className="h-full w-full animate-pulse rounded-xl bg-slate-100" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {selectorUsage.map(({ spec, items }) => (
                <SelectorUsageCard key={spec} spec={spec} items={items} />
              ))}
            </div>
          )}

        </section>

        <section className="space-y-4 pb-10">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold text-[#001428]">
              Tendências ao longo do tempo
            </h2>
            <p className="text-sm text-muted-foreground">
              Visualize como as preferências dos usuários evoluem mês a mês para
              cada especificação. Selecione uma categoria para destacar os
              valores mais escolhidos.
            </p>
          </div>

          {isBusy && !data ? (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
              <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
            </div>
          ) : (
            <SelectorTrendChart
              timeline={selectorTimeline}
              stats={
                data?.selectorStats ?? {
                  ram: [],
                  rom: [],
                  battery: [],
                  camera: [],
                  benchmark: [],
                  price_range: []
                }
              }
            />
          )}
        </section>
      </div>
    </main>
  );
}
