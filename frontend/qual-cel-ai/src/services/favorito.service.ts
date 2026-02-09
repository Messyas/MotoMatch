import axios from "axios";
import { backApi } from "./api";
import type {
  BackendFavorito,
  FavoriteItem,
} from "@/types/favoritos";
import type { CriterioPesquisa } from "@/types/phones";
import { mapDispositivoToPhoneItem } from "./mappers/phone.mapper";

function mapBackendFavoritoToFavoriteItem(
  favorito: BackendFavorito
): FavoriteItem {
  const phoneItem = mapDispositivoToPhoneItem(favorito.dispositivo);

  phoneItem.isFavorite = true;
  phoneItem.favoriteId = favorito.idFavorito;
  phoneItem.historicoId = favorito.idHistorico;

  const historicoInfo = favorito.historico ?? {
    idHistorico: favorito.idHistorico,
    criterios: [],
    createdAt: new Date().toISOString(),
  };

  return {
    idFavorito: favorito.idFavorito,
    dispositivo: phoneItem,
    historico: {
      idHistorico: historicoInfo.idHistorico,
      criterios: (historicoInfo.criterios ?? []) as CriterioPesquisa[],
      createdAt: historicoInfo.createdAt,
    },
  };
}

export async function listarFavoritos(): Promise<FavoriteItem[]> {
  try {
    const { data } = await backApi.get<BackendFavorito[]>("/favoritos", {
      withCredentials: true,
    });
    return data.map(mapBackendFavoritoToFavoriteItem);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return [];
    }
    console.error("Erro ao listar favoritos:", error);
    throw error;
  }
}

export async function adicionarFavorito(payload: {
  idDispositivo: string;
  idHistorico: string;
}): Promise<FavoriteItem> {
  const { data } = await backApi.post<BackendFavorito>(
    "/favoritos",
    payload,
    {
      withCredentials: true,
    }
  );

  return mapBackendFavoritoToFavoriteItem(data);
}

export async function removerFavorito(
  idDispositivo: string
): Promise<void> {
  await backApi.delete(`/favoritos/${idDispositivo}`, {
    withCredentials: true,
  });
}

