import { prisma } from "../../../database/prismaSingleton";
import { randomUUID } from "crypto"; 
import { SeletoresPesquisa, CriterioPesquisa } from '../dispositivo.types';


type RegistrarEventoPesquisaParams = {
  idUsuario?: string;
  idSessao?: string | null;
  textoLivre?: string | null;
  selecionadosUi?: SeletoresPesquisa;
  criteriosGemini?: CriterioPesquisa[];
  criteriosUsados?: CriterioPesquisa[];
  descartados?: CriterioPesquisa[];
};

export async function registrarEventoPesquisa({
  idUsuario,
  idSessao = null,
  textoLivre = null,
  selecionadosUi,
  criteriosGemini,
  criteriosUsados,
  descartados,
}: RegistrarEventoPesquisaParams) {
  try {
    const evento = await prisma.pesquisaEvento.create({
      data: {
        // 2. ADICIONADO: Gerar o ID manualmente para corrigir o erro
        idEvento: randomUUID(), 
        
        idUsuario: idUsuario ?? null,
        idSessao: idSessao ?? null,
        textoLivre,
        selecionadosUi: selecionadosUi as any,
        criteriosGemini: criteriosGemini as any,
        criteriosUsados: criteriosUsados as any,
        descartados: descartados as any,
      },
    });
    return evento;
  } catch (error) {
    console.error("[registrarEventoPesquisa] Falha ao registrar evento:", error);
    return null;
  }
}