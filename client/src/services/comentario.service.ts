import { backApi } from "./api";
import type {
  ComentariosDispositivoResponse,
  AspectoScoresResponse,
  ResumoComentariosResponse,
} from "@/types/comentarios";

export const getComentariosPorDispositivo = async (
  idDispositivo: string
): Promise<ComentariosDispositivoResponse> => {
  const { data } = await backApi.get<ComentariosDispositivoResponse>(
    `/dispositivos/${idDispositivo}/comentarios`
  );
  return data;
};

export const getAspectoScoresPorDispositivo = async (
  idDispositivo: string
): Promise<AspectoScoresResponse> => {
  const { data } = await backApi.get<AspectoScoresResponse>(
    `/dispositivos/${idDispositivo}/aspectos`
  );
  return data;
};

export const getResumoPorDispositivo = async (
  idDispositivo: string
): Promise<ResumoComentariosResponse> => {
  const { data } = await backApi.get<ResumoComentariosResponse>(
    `/dispositivos/${idDispositivo}/resumo`
  );
  return data;
};
