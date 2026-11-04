"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminOverview } from "@/services/admin.service";

const ADMIN_OVERVIEW_QUERY_KEY = ["admin-overview"];

/**
 * Centraliza a busca do overview de admin e mantém o cache vivo entre páginas.
 * Define staleTime/gcTime altos e desativa refetch automático para evitar
 * recarregar e perder dados ao navegar entre dashboards.
 */
export function useAdminOverviewQuery() {
  return useQuery({
    queryKey: ADMIN_OVERVIEW_QUERY_KEY,
    queryFn: getAdminOverview,
    staleTime: 5 * 60 * 1000, // 5 minutos em cache sem marcar como "stale"
    gcTime: 30 * 60 * 1000, // 30 minutos antes de coletar o cache
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
}

export { ADMIN_OVERVIEW_QUERY_KEY };
