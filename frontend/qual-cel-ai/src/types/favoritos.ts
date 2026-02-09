import type { BackendDispositivo, CriterioPesquisa, PhoneItem } from "./phones";

export interface BackendFavorito {
  idFavorito: string;
  idUsuario: string;
  idDispositivo: string;
  idHistorico: string;
  dispositivo: BackendDispositivo;
  historico?: {
    idHistorico: string;
    criterios: CriterioPesquisa[];
    createdAt: string;
  };
}

export interface FavoriteItem {
  idFavorito: string;
  dispositivo: PhoneItem;
  historico: {
    idHistorico: string;
    criterios: CriterioPesquisa[];
    createdAt: string;
  };
}
