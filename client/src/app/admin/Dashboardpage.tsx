"use client";

import { useMemo, type ElementType } from "react";
import {
  Loader2,
  Users,
  Smartphone,
  ShieldCheck,
  LifeBuoy,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserGrowthChart } from "./_components/UserGrowthChart";
import type {
  AdminOverviewMetrics,
  SelectorStatItem,
  SearchUsageMetrics,
} from "@/types/admin";
import { HorizontalBarChart } from "./_components/HorizontalBarChart";
import { TextUsageDonutChart } from "./_components/TextUsageDonutChart";
import { SelectorUsageCard } from "./_components/SelectorUsageCard";
import { SearchModeBarChart } from "./_components/SearchModeBarChart";
import { SelectorTrendChart } from "./_components/SelectorTrendChart";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { useAdminOverviewQuery } from "./_hooks/useAdminOverview";

const numberFormatter = new Intl.NumberFormat("pt-BR");

type MetricCardConfig = {
  label: string;
  value: number;
  icon: ElementType;
  gradient: string;
};

type SpecKey = "ram" | "rom" | "battery" | "camera" | "benchmark" | "price_range";

function buildMetricCards(metrics: AdminOverviewMetrics): MetricCardConfig[] {
  return [
    {
      label: "Total de usuários",
      value: metrics.totals.usuarios,
      icon: Users,
      gradient: "from-sky-500 to-blue-600",
    },
    {
      label: "Dispositivos cadastrados",
      value: metrics.totals.dispositivos,
      icon: Smartphone,
      gradient: "from-amber-400 to-orange-500",
    },
    {
      label: "Administradores",
      value: metrics.totals.admins,
      icon: ShieldCheck,
      gradient: "from-emerald-400 to-teal-500",
    },
    {
      label: "Equipe de suporte",
      value: metrics.totals.suporte,
      icon: LifeBuoy,
      gradient: "from-rose-400 to-pink-500",
    },
  ];
}

export default function AdminDashboardPage() {
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

  const cards = useMemo(() => (data ? buildMetricCards(data) : []), [data]);
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
  const searchUsage = useMemo<SearchUsageMetrics>(
    () =>
      data?.searches ?? {
        total: 0,
        withText: 0,
        withoutText: 0,
        textOnly: 0,
        selectorsOnly: 0,
        textAndSelectors: 0,
      },
    [data]
  );
  const searchModeData = useMemo(
    () => [
      {
        label: "Somente texto livre",
        value: searchUsage.textOnly,
        gradient: "from-fuchsia-400 to-pink-500",
      },
      {
        label: "Texto + seletores",
        value: searchUsage.textAndSelectors,
        gradient: "from-emerald-400 to-teal-500",
      },
      {
        label: "Somente seletores",
        value: searchUsage.selectorsOnly,
        gradient: "from-sky-500 to-blue-600",
      },
    ],
    [searchUsage]
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
            de dispositivos e dos usuarios a partir deste painel.
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

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(isBusy && !data ? Array.from({ length: 4 }) : cards).map(
            (item, index) => {
              if (!data) {
                return (
                  <Card
                    key={`skeleton-${index}`}
                    className="animate-pulse border border-slate-200/60 bg-white/70"
                  >
                    <CardContent className="flex flex-col gap-4 py-6">
                      <div className="h-10 w-10 rounded-full bg-gray-200" />
                      <div className="h-4 w-24 rounded bg-gray-200" />
                      <div className="h-6 w-32 rounded bg-gray-200" />
                    </CardContent>
                  </Card>
                );
              }

              const typedItem = item as MetricCardConfig;
              const Icon = typedItem.icon;

              return (
                <Card
                  key={typedItem.label}
                  className="border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg"
                >
                  <CardContent className="flex flex-col gap-4 py-6">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${typedItem.gradient} text-white`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                      {typedItem.label}
                    </span>
                    <span className="text-3xl font-bold text-[#001428]">
                      {numberFormatter.format(typedItem.value)}
                    </span>
                  </CardContent>
                </Card>
              );
            }
          )}
        </section>

        <section>
          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-[#001428]">
                Evolução da base de usuários
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Total acumulado de usuários cadastrados mês a mês.
              </p>
            </CardHeader>
            <CardContent>
              {isBusy && !data ? (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
                </div>
              ) : (
                <UserGrowthChart data={data?.timeline ?? []} />
              )}
            </CardContent>
          </Card>
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

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border border-slate-200 bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-[#001428]">
                  Uso de texto livre nas pesquisas
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Distribuição entre pesquisas com descrição escrita e aquelas
                  realizadas apenas pelos seletores.
                </p>
              </CardHeader>
              <CardContent className="pt-4">
                {isBusy && !data ? (
                  <div className="flex h-48 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
                  </div>
                ) : (
                  <TextUsageDonutChart
                    withText={searchUsage.withText}
                    withoutText={searchUsage.withoutText}
                  />
                )}
              </CardContent>
            </Card>

            <Card className="border border-slate-200 bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-[#001428]">
                  Combinação de interação
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Como os usuários misturam texto livre e seletores em cada
                  pesquisa enviada.
                </p>
              </CardHeader>
              <CardContent className="pt-4">
                {isBusy && !data ? (
                  <div className="flex h-48 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
                  </div>
                ) : (
                  <SearchModeBarChart data={searchModeData} />
                )}
              </CardContent>
            </Card>
          </div>
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
