import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prismaSingleton";
import { salvarHistorico } from "../../historico/historico.service";
import {
  RecommendationGateway,
  createDefaultRecommendationGateway,
} from "./recommendation.gateway";
import {
  RecommendationRequest,
  RecommendationServiceCriterion,
  RecommendationServiceDevicePayload,
  RecommendationServiceScore,
} from "./recommendation.types";
import {
  PesquisaConsoleMetadata,
  PesquisaDispositivoDTO,
} from "../dispositivo.types";

type AspectScoreRow = {
  idDispositivo: string;
  aspecto: string;
  mediaScore: number | null;
};

/**
 * Fachada responsável por orquestrar a busca de dispositivos recomendados.
 */
export class MatchingFacade {
  constructor(private readonly gateway: RecommendationGateway) {}

  async findMatchingDispositivos(
    criterios: PesquisaDispositivoDTO["caracteristicas"],
    idUsuario?: string,
    metadata?: PesquisaConsoleMetadata
  ) {
    const dispositivos = await this.fetchDispositivos();
    if (!dispositivos.length) {
      return [];
    }

    const aspectScoresRaw = await this.fetchAspectScores(
      dispositivos.map((d) => d.idDispositivo)
    );
    const aspectScoreMap = buildAspectScoreMap(aspectScoresRaw);

    const devicesPayload = buildDevicePayloadForRecommendationService(
      dispositivos,
      aspectScoreMap
    );

    const criteriosPayload = sanitizeCriteriaForRecommendationService(criterios);
    if (!criteriosPayload.length) {
      return [];
    }

    const externalScores = await this.gateway.scoreDevices({
      criterios: criteriosPayload,
      dispositivos: devicesPayload,
    } as RecommendationRequest);

    if (!externalScores?.length) {
      throw new Error(
        "Serviço de recomendação indisponível. Tente novamente em instantes."
      );
    }

    const externalRecommendations = mapScoresToRecommendations(
      externalScores,
      dispositivos
    ).slice(0, 3);

    if (!externalRecommendations.length) {
      return [];
    }

    return anexarHistoricoRecomendacoes(
      externalRecommendations,
      criterios,
      idUsuario,
      metadata
    );
  }

  private async fetchDispositivos() {
    return prisma.dispositivo.findMany({
      include: {
        caracteristicas: {
          include: {
            caracteristica: true,
          },
        },
      },
    });
  }

  private async fetchAspectScores(deviceIds: string[]) {
    if (!deviceIds.length) {
      return [];
    }
    return prisma.dispositivoAspectoScore.findMany({
      where: { idDispositivo: { in: deviceIds } },
      select: { idDispositivo: true, aspecto: true, mediaScore: true },
    });
  }
}

let defaultMatchingFacade = new MatchingFacade(
  createDefaultRecommendationGateway()
);

export function getMatchingFacade(): MatchingFacade {
  return defaultMatchingFacade;
}

export function setMatchingFacade(facade: MatchingFacade) {
  defaultMatchingFacade = facade;
}

function buildAspectScoreMap(
  rows: AspectScoreRow[]
): Map<string, Partial<Record<string, number>>> {
  const map = new Map<string, Partial<Record<string, number>>>();
  for (const row of rows) {
    const aspectKey = row.aspecto?.toLowerCase();
    if (!aspectKey) continue;
    const raw = row.mediaScore;
    let numeric: number | null = null;
    if (raw !== null && raw !== undefined) {
      const rawNumber = Number(raw);
      if (!Number.isNaN(rawNumber)) {
        numeric = rawNumber > 1 ? rawNumber / 5 : rawNumber;
      }
    }
    if (numeric === null) continue;
    const current = map.get(row.idDispositivo) ?? {};
    current[aspectKey] = clampScore(numeric, 0.5);
    map.set(row.idDispositivo, current);
  }
  return map;
}

function buildDevicePayloadForRecommendationService(
  dispositivos: Awaited<ReturnType<MatchingFacade["fetchDispositivos"]>>,
  aspectScoreMap: Map<string, Partial<Record<string, number>>>
): RecommendationServiceDevicePayload[] {
  return dispositivos.map((dispositivo) => {
    const caracteristicas = (dispositivo.caracteristicas ?? [])
      .map((entry) => ({
        tipo: entry.caracteristica?.tipo ?? "",
        descricao: entry.caracteristica?.descricao ?? "",
      }))
      .filter(
        (caracteristica): caracteristica is RecommendationServiceCriterion =>
          Boolean(caracteristica.tipo && caracteristica.descricao)
      );

    const precoValue =
      dispositivo.preco !== undefined && dispositivo.preco !== null
        ? Number(dispositivo.preco)
        : undefined;
    const normalizedPrice =
      typeof precoValue === "number" && Number.isFinite(precoValue)
        ? precoValue
        : undefined;

    const aspectScores = aspectScoreMap.get(dispositivo.idDispositivo);
    const normalizedAspectScores =
      aspectScores && Object.keys(aspectScores).length
        ? Object.fromEntries(
            Object.entries(aspectScores).filter(
              ([, value]) => typeof value === "number" && Number.isFinite(value as number)
            )
          )
        : undefined;

    return {
      id: dispositivo.idDispositivo,
      preco: normalizedPrice,
      caracteristicas,
      aspect_scores: normalizedAspectScores as RecommendationServiceDevicePayload["aspect_scores"],
    };
  });
}

function sanitizeCriteriaForRecommendationService(
  criterios: PesquisaDispositivoDTO["caracteristicas"]
): RecommendationServiceCriterion[] {
  return (criterios ?? [])
    .map((criterio) => {
      const tipo = criterio?.tipo?.toString().trim();
      const descricao = criterio?.descricao?.toString().trim();
      if (!tipo || !descricao) {
        return null;
      }
      return { tipo, descricao };
    })
    .filter(
      (criterio): criterio is RecommendationServiceCriterion => criterio !== null
    );
}

function mapScoresToRecommendations(
  scores: RecommendationServiceScore[],
  dispositivos: Awaited<ReturnType<MatchingFacade["fetchDispositivos"]>>
) {
  const dispositivoMap = new Map(
    dispositivos.map((dispositivo) => [dispositivo.idDispositivo, dispositivo])
  );

  return scores
    .map((score) => {
      const dispositivo = dispositivoMap.get(score.id);
      if (!dispositivo) {
        return null;
      }
      return {
        ...dispositivo,
        matchScore: score.matchScore,
        perfilMatchPercent: score.perfilMatchPercent,
        criteriosMatchPercent:
          typeof score.criteriosMatchPercent === "number"
            ? score.criteriosMatchPercent
            : undefined,
        matchExplanation: score.matchExplanation,
        justificativas: score.justificativas ?? [],
        historicoId: undefined as string | undefined,
      };
    })
    .filter((value): value is NonNullable<typeof value> => value !== null);
}

async function anexarHistoricoRecomendacoes(
  recomendacoes: any[],
  criterios: PesquisaDispositivoDTO["caracteristicas"],
  idUsuario?: string,
  metadata?: PesquisaConsoleMetadata
) {
  if (!recomendacoes.length) {
    return [];
  }

  if (!idUsuario) {
    return recomendacoes;
  }

  const normalizedMetadata: PesquisaConsoleMetadata = {
    consoleInput: metadata?.consoleInput ?? null,
    seletores: { ...metadata?.seletores },
  };

  if (!normalizedMetadata.consoleInput) {
    const textoLivre = criterios.find((criterio) => criterio.tipo === "texto_livre");
    if (textoLivre?.descricao) {
      normalizedMetadata.consoleInput = textoLivre.descricao;
    }
  }

  const historicoId = await salvarHistorico(
    idUsuario,
    criterios,
    recomendacoes,
    normalizedMetadata
  );

  return recomendacoes.map((rec) => ({
    ...rec,
    historicoId: historicoId ?? rec.historicoId ?? undefined,
  }));
}

function clampScore(value: number | null | undefined, fallback = 0.5): number {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, value));
}
