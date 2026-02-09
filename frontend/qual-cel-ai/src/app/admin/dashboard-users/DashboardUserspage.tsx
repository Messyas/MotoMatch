"use client";

import { useMemo, type ElementType } from "react";
import { Loader2, User, Users, ShieldCheck, LifeBuoy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserGrowthChart } from "../_components/UserGrowthChart";
import { SearchModeBarChart } from "../_components/SearchModeBarChart";
import { TextUsageDonutChart } from "../_components/TextUsageDonutChart";
import type { AdminOverviewMetrics, SearchUsageMetrics } from "@/types/admin";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { useAdminOverviewQuery } from "../_hooks/useAdminOverview";

const numberFormatter = new Intl.NumberFormat("pt-BR");

type MetricCardConfig = {
  label: string;
  value: number;
  icon: ElementType;
  gradient: string;
};

function buildMetricCards(metrics: AdminOverviewMetrics): MetricCardConfig[] {
  const usuariosComuns =
    metrics.totals.usuarios -
    (metrics.totals.admins ?? 0) -
    (metrics.totals.suporte ?? 0);
  return [
    {
      label: "Total de usuários",
      value: metrics.totals.usuarios,
      icon: Users,
      gradient: "from-sky-500 to-blue-600",
    },
    {
      label: "Usuários comuns",
      value: usuariosComuns,
      icon: User,
      gradient: "from-indigo-400 to-purple-500",
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

export default function AdminDashboardUsersPage() {
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
            Acompanhe a evolução da base de dados, veja a evolução dos usuarios
            a partir deste painel.
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

        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(isBusy && !data ? Array.from({ length: 4 }) : cards).map(
              (item, index) => {
                if (!data) {
                  return (
                    <Card
                      key={`skeleton-${index}`}
                      className="animate-pulse border border-slate-200/60 bg-white/70"
                    >
                      <CardContent className="flex items-center gap-3 p-4">
                        <div className="h-10 w-10 rounded-full bg-gray-200" />
                        <div className="flex flex-col gap-2">
                          <div className="h-4 w-24 rounded bg-gray-200" />
                          <div className="h-6 w-20 rounded bg-gray-200" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                }

                const typedItem = item as MetricCardConfig;
                const Icon = typedItem.icon;

                return (
                  <Card
                    key={typedItem.label}
                    className="border border-slate-200 bg-white shadow-sm"
                  >
                    <CardContent className="flex items-center gap-3 p-4">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${typedItem.gradient} text-white`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-muted-foreground">
                          {typedItem.label}
                        </span>
                        <span className="text-2xl font-bold text-[#001428]">
                          {numberFormatter.format(typedItem.value)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              }
            )}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
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
                  <div className="flex h-40 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
                  </div>
                ) : (
                  <TextUsageDonutChart
                    withText={searchUsage.withText}
                    withoutText={searchUsage.withoutText}
                    size="compact"
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
                  <div className="flex h-40 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
                  </div>
                ) : (
                  <SearchModeBarChart data={searchModeData} size="compact" />
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-[#001428]">
                Evolução da base de usuários
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Total acumulado de usuários cadastrados mês a mês.
              </p>
            </CardHeader>
            <CardContent className="pt-2">
              {isBusy && !data ? (
                <div className="flex h-48 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
                </div>
              ) : (
                <UserGrowthChart
                  data={data?.timeline ?? []}
                  heightClassName="h-64 lg:h-72"
                />
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
