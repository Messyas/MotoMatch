export interface AdicionarFavoritoInput {
  idDispositivo: string;
  idHistorico: string;
}

export interface RemoverFavoritoParams extends Record<string, string> {
  idDispositivo: string;
}
