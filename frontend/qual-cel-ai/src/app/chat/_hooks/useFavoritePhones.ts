"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adicionarFavorito,
  listarFavoritos,
  removerFavorito,
} from "@/services/favorito.service";
import type { FavoriteItem } from "@/types/favoritos";
import type { PhoneItem } from "@/types/phones";
import { toast } from "sonner";

type ToggleFavoriteArgs = {
  idDispositivo: string;
  idHistorico?: string;
  phoneItem?: PhoneItem;
};

type AddFavoriteVariables = {
  idDispositivo: string;
  idHistorico: string;
  phoneItem?: PhoneItem;
};

type RemoveFavoriteVariables = {
  idDispositivo: string;
};

const FAVORITOS_QUERY_KEY = ["favoritos"] as const;

/**
 * Hook responsável por orquestrar as operações de favoritos
 * com o backend, mantendo um cache compartilhado via React Query.
 */
export function useFavoritePhones() {
  const queryClient = useQueryClient();
  // Controla quais dispositivos estão em mutação para liberar feedback pontual.
  const [pendingFavorites, setPendingFavorites] = useState<Set<string>>(
    () => new Set()
  );

  const addPendingFavorite = useCallback((id: string) => {
    setPendingFavorites((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const removePendingFavorite = useCallback((id: string) => {
    setPendingFavorites((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const {
    data: favoritos = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: FAVORITOS_QUERY_KEY,
    queryFn: listarFavoritos,
  });

  const favoriteIds = useMemo(() => {
    return new Set(favoritos.map((fav) => fav.dispositivo.id));
  }, [favoritos]);

  const adicionarFavoritoMutation = useMutation({
    mutationFn: async ({
      idDispositivo,
      idHistorico,
    }: AddFavoriteVariables) => {
      return adicionarFavorito({
        idDispositivo,
        idHistorico,
      });
    },
    onMutate: async ({ idDispositivo, phoneItem }) => {
      await queryClient.cancelQueries({ queryKey: FAVORITOS_QUERY_KEY });

      addPendingFavorite(idDispositivo);

      const previousFavoritos =
        queryClient.getQueryData<FavoriteItem[]>(FAVORITOS_QUERY_KEY) ?? [];

      const optimisticId = `optimistic-${idDispositivo}`;

      if (phoneItem) {
        // Cria uma versão otimista do favorito para refletir a ação antes da resposta do backend.
        const optimisticFavorite: FavoriteItem = {
          idFavorito: optimisticId,
          dispositivo: {
            ...phoneItem,
            isFavorite: true,
            favoriteId: optimisticId,
          },
          historico: {
            idHistorico:
              phoneItem.historicoId ??
              optimisticId /* garante fallback previsível */,
            criterios: [],
            createdAt: new Date().toISOString(),
          },
        };

        queryClient.setQueryData<FavoriteItem[]>(
          FAVORITOS_QUERY_KEY,
          (current) => {
            const safeCurrent = current ?? [];
            const alreadyPresent = safeCurrent.some(
              (fav) => fav.dispositivo.id === phoneItem.id
            );

            if (alreadyPresent) return safeCurrent;
            return [optimisticFavorite, ...safeCurrent];
          }
        );
      }

      return {
        previousFavoritos,
        optimisticId,
      };
    },
    onError: (_err, variables, context) => {
      removePendingFavorite(variables.idDispositivo);
      if (context?.previousFavoritos) {
        queryClient.setQueryData(
          FAVORITOS_QUERY_KEY,
          context.previousFavoritos
        );
      }
      toast.error("Não foi possível atualizar seus favoritos agora.");
    },
    onSuccess: (novoFavorito, variables, context) => {
      removePendingFavorite(variables.idDispositivo);
      queryClient.setQueryData<FavoriteItem[]>(
        FAVORITOS_QUERY_KEY,
        (current) => {
          const safeCurrent = current ?? [];
          const filtered = safeCurrent.filter(
            (fav) => fav.idFavorito !== context?.optimisticId
          );

          const exists = filtered.some(
            (fav) => fav.dispositivo.id === novoFavorito.dispositivo.id
          );
          if (exists) {
            return filtered.map((fav) =>
              fav.dispositivo.id === novoFavorito.dispositivo.id
                ? novoFavorito
                : fav
            );
          }
          return [novoFavorito, ...filtered];
        }
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: FAVORITOS_QUERY_KEY });
    },
  });

  const removerFavoritoMutation = useMutation({
    mutationFn: async ({ idDispositivo }: RemoveFavoriteVariables) => {
      return removerFavorito(idDispositivo);
    },
    onMutate: async ({ idDispositivo }) => {
      await queryClient.cancelQueries({ queryKey: FAVORITOS_QUERY_KEY });

      addPendingFavorite(idDispositivo);

      const previousFavoritos =
        queryClient.getQueryData<FavoriteItem[]>(FAVORITOS_QUERY_KEY) ?? [];

      // Remove o item do cache imediatamente para um efeito de "unfavorite" instantâneo.
      queryClient.setQueryData<FavoriteItem[]>(
        FAVORITOS_QUERY_KEY,
        (current) => {
          if (!current) return current;
          return current.filter((fav) => fav.dispositivo.id !== idDispositivo);
        }
      );

      return { previousFavoritos };
    },
    onError: (_err, variables, context) => {
      removePendingFavorite(variables.idDispositivo);
      if (context?.previousFavoritos) {
        queryClient.setQueryData(
          FAVORITOS_QUERY_KEY,
          context.previousFavoritos
        );
      }
      toast.error("Não foi possível remover este favorito. Tente novamente.");
    },
    onSuccess: (_data, variables) => {
      removePendingFavorite(variables.idDispositivo);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: FAVORITOS_QUERY_KEY });
    },
  });

  const toggleFavorite = useCallback(
    async ({ idDispositivo, idHistorico, phoneItem }: ToggleFavoriteArgs) => {
      const jaFavoritado = favoriteIds.has(idDispositivo);

      if (!jaFavoritado) {
        if (!idHistorico) {
          throw new Error(
            "Não foi possível identificar o histórico relacionado ao dispositivo."
          );
        }
        if (!phoneItem) {
          throw new Error(
            "Não foi possível carregar os dados do dispositivo selecionado."
          );
        }
        await adicionarFavoritoMutation.mutateAsync({
          idDispositivo,
          idHistorico,
          phoneItem,
        });
        return;
      }

      await removerFavoritoMutation.mutateAsync({ idDispositivo });
    },
    [adicionarFavoritoMutation, favoriteIds, removerFavoritoMutation]
  );

  const pendingFavoriteIds = pendingFavorites as ReadonlySet<string>;

  return {
    favoritos,
    favoriteIds,
    isLoading,
    isError,
    toggleFavorite,
    adicionarFavorito: (variables: AddFavoriteVariables) =>
      adicionarFavoritoMutation.mutateAsync(variables),
    removerFavorito: (idDispositivo: string) =>
      removerFavoritoMutation.mutateAsync({ idDispositivo }),
    pendingFavoriteIds,
    isMutating:
      adicionarFavoritoMutation.isPending ||
      removerFavoritoMutation.isPending ||
      pendingFavoriteIds.size > 0,
  };
}
