"use client";

import { useCallback } from "react";
import { useDispositivosContext } from "@/components/dispositivosProvider/dispositivosProvider";
import type { PhoneItem } from "@/types/phones";

export function useDevice() {
  const {
    dispositivos,
    // REMOVIDO: dispositivosPesquisa,
    isLoading,
    // REMOVIDO: isLoadingPesquisa,
    isLoadingDetalhe,
    isError,
    isErrorDetalhe,
    criterios,
    pesquisaConsole,
    dispositivoDetalhado,
    isHydrated,
    setCriterios,
    refetchLista,
    // REMOVIDO: refetchPesquisa,
    criar,
    atualizar,
    excluir,
    obterDispositivoDetalhado,
  } = useDispositivosContext();

  // MODIFICADO: A lógica de loading não inclui mais 'isLoadingPesquisa'
  const loading = isLoading || isLoadingDetalhe;

  const getById = useCallback(
    (id: string): PhoneItem | undefined =>
      // MODIFICADO: Não busca mais em 'dispositivosPesquisa'
      dispositivos.find((d) => String(d.id) === String(id)),
    [dispositivos]
  );

  const refreshLista = useCallback(() => {
    if (!loading) refetchLista();
  }, [refetchLista, loading]);

  // REMOVIDO: A função 'refreshPesquisa' não é mais necessária
  // const refreshPesquisa = useCallback(() => {
  //   if (!loading) refetchPesquisa();
  // }, [refetchPesquisa, loading]);

  const create = useCallback(
    async (payload: Omit<PhoneItem, "id">) => {
      return await criar(payload);
    },
    [criar]
  );

  const update = useCallback(
    async (id: string, payload: Omit<PhoneItem, "id">) => {
      return await atualizar(id, payload);
    },
    [atualizar]
  );

  const remove = useCallback(
    async (id: string) => {
      await excluir(id);
    },
    [excluir]
  );

  const fetchDetail = useCallback(
    async (id: string) => {
      return await obterDispositivoDetalhado(id);
    },
    [obterDispositivoDetalhado]
  );

  return {
    // Dados
    dispositivos,
    // REMOVIDO: dispositivosPesquisa,
    criterios,
    pesquisaConsole,
    dispositivoDetalhado,
    isHydrated,

    // Status
    loading,
    error: isError
      ? "Ocorreu um erro ao carregar a lista de dispositivos."
      : null,
    errorDetalhe: isErrorDetalhe,

    // Ações
    refreshLista,
    // REMOVIDO: refreshPesquisa,
    getById,

    // CRUD
    create,
    update,
    remove,

    // Pesquisa e detalhe
    setCriterios,
    fetchDetail,
  };
}