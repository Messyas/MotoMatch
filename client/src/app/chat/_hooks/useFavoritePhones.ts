"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FavoriteItem } from "@/types/favoritos";
import type { PhoneItem } from "@/types/phones";
import { toast } from "sonner";

const FAVORITES_STORAGE_KEY = "phonematch_favorites_v2";

function loadFavoritesFromStorage(): FavoriteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Falha ao ler favoritos do localStorage:", err);
    return [];
  }
}

function saveFavoritesToStorage(favorites: FavoriteItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch (err) {
    console.error("Falha ao salvar favoritos no localStorage:", err);
  }
}

export function useFavoritePhones() {
  const [favoritos, setFavoritos] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setFavoritos(loadFavoritesFromStorage());
    setIsLoading(false);
  }, []);

  const favoriteIds = useMemo(() => {
    return new Set(favoritos.map((fav) => fav.dispositivo.id));
  }, [favoritos]);

  const toggleFavorite = useCallback(
    async ({
      idDispositivo,
      phoneItem,
    }: {
      idDispositivo: string;
      idHistorico?: string;
      phoneItem?: PhoneItem;
    }) => {
      const isAlreadyFav = favoriteIds.has(idDispositivo);

      if (isAlreadyFav) {
        // Remover
        const updated = favoritos.filter(
          (fav) => fav.dispositivo.id !== idDispositivo,
        );
        setFavoritos(updated);
        saveFavoritesToStorage(updated);
        toast.info("Aparelho removido dos favoritos");
      } else {
        // Adicionar
        const newFav: FavoriteItem = {
          idFavorito: `fav-${idDispositivo}`,
          dispositivo: phoneItem
            ? { ...phoneItem, isFavorite: true, favoriteId: `fav-${idDispositivo}` }
            : {
              id: idDispositivo,
              title: "Celular",
              imageUrls: [],
              specs: {},
              isFavorite: true,
            },
          historico: {
            idHistorico: `hist-${Date.now()}`,
            criterios: [],
            createdAt: new Date().toISOString(),
          },
        };
        const updated = [newFav, ...favoritos];
        setFavoritos(updated);
        saveFavoritesToStorage(updated);
        toast.success("Aparelho salvo nos favoritos (offline)");
      }
    },
    [favoriteIds, favoritos],
  );

  const removerFavorito = useCallback(
    async (idDispositivo: string) => {
      const updated = favoritos.filter(
        (fav) => fav.dispositivo.id !== idDispositivo,
      );
      setFavoritos(updated);
      saveFavoritesToStorage(updated);
      toast.info("Aparelho removido dos favoritos");
    },
    [favoritos],
  );

  return {
    favoritos,
    favoriteIds,
    isLoading,
    isError: false,
    toggleFavorite,
    removerFavorito,
    isMutating: () => false,
  };
}
